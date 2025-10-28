#include <functional>
#include "Smoothing_Spline_1D.h"
#include <iostream>
#include <cmath>
#include <stdexcept>

namespace Com_Methods {
    Smoothing_Spline_1D::Smoothing_Spline_1D(const double &SMOOTH, const double &W)
    {
        this->SMOOTH = SMOOTH;
		this->W = W;
    }

    void Smoothing_Spline_1D::Transition_To_Master_Element(int Seg_Num, const double &X, double &Ksi) const
    {
        Ksi = 2.0 * (X - Points[Seg_Num].x()) / (Points[Seg_Num + 1].x() - Points[Seg_Num].x()) - 1.0;
    }

    double Smoothing_Spline_1D::Basis_Function(int Number, const double &Ksi) const
    {
        switch (Number)
        {
            case 1:  return 0.5*(1 - Ksi);
            case 2:  return 0.5*(1 + Ksi);
            default: throw std::invalid_argument("Error in the basis function number...");
        }
    }

    double Smoothing_Spline_1D::Der_Basis_Function(int Number, const double &Ksi) const
    {
        switch (Number)
        {
            case 1:  return -0.5;
            case 2:  return  0.5;
            default: throw std::invalid_argument("Error in the basis function derivative number...");
        }
    }

    void Smoothing_Spline_1D::Update_Spline(const std::vector<Point>  & Points,
                                            const std::vector<double> & F_Value)
    {
        // Проверка входных данных
        if (Points.size() != F_Value.size() || Points.size() < 2) {
            throw std::invalid_argument("Invalid input data");
        }

        this->Points = Points;
        int Num_Segments = Points.size() - 1;

        // Восстанавливаем оригинальную логику инициализации
        alpha.clear();
        alpha.resize(Num_Segments + 1, 0.0);

        std::vector<double> a, b, c;
        a.resize(Num_Segments + 1, 0.0);
        b.resize(Num_Segments + 1, 0.0);
        c.resize(Num_Segments + 1, 0.0);
        
        std::function<void(int Num_Segment, const Point &P, const double &F_Val, const double &w)> 
        Assembling = [&](int i, const Point &P, const double &F_Val, const double &w)
        {
            double X = P.x(), Ksi;
            Transition_To_Master_Element(i, X, Ksi);
            double f1 = Basis_Function(1, Ksi);
            double f2 = Basis_Function(2, Ksi);

            b[i]     += (1.0 - SMOOTH) * w * f1 * f1;
            b[i + 1] += (1.0 - SMOOTH) * w * f2 * f2;
            a[i + 1] += (1.0 - SMOOTH) * w * f1 * f2;
            c[i]     += (1.0 - SMOOTH) * w * f2 * f1;
            alpha[i]     += (1.0 - SMOOTH) * w * f1 * F_Val;
            alpha[i + 1] += (1.0 - SMOOTH) * w * f2 * F_Val;
        };

        for (int i = 0; i < Num_Segments; i++)
        {
            // double W = 0.5;
            Assembling(i, this->Points[i], F_Value[i], W);
            Assembling(i, this->Points[i + 1], F_Value[i + 1], W);

            double h = Points[i + 1].x() - Points[i].x();
            if (h < 1e-10) {
                throw std::invalid_argument("Segment length too small");
            }

            // Оригинальные коэффициенты сглаживания
            b[i]     += 1.0 / h * SMOOTH;
            b[i + 1] += 1.0 / h * SMOOTH;
            a[i + 1] -= 1.0 / h * SMOOTH;
            c[i]     -= 1.0 / h * SMOOTH;
        }

        // Прямой ход прогонки (проверяем границы)
        for (int j = 1; j < Num_Segments + 1; j++)
        {
            // Добавляем проверку деления на ноль
            if (std::abs(b[j - 1]) < 1e-12) {
                throw std::runtime_error("Division by zero in forward sweep");
            }
            double m = a[j] / b[j - 1];
            b[j] -= m * c[j - 1];
            alpha[j] -= m * alpha[j - 1]; 
        }

        // Обратный ход прогонки (проверяем границы)
        if (std::abs(b[Num_Segments]) < 1e-12) {
            throw std::runtime_error("Division by zero in backward sweep");
        }
        alpha[Num_Segments] /= b[Num_Segments];
        for (int j = Num_Segments - 1; j >= 0; j--)
        {
            alpha[j] = (alpha[j] - alpha[j + 1] * c[j]) / b[j];
        }
    }

    void Smoothing_Spline_1D::Get_Value(const Point &P, double * Res)const
    {
        double eps = 1e-7;
        int Num_Segments = Points.size() - 1;
        double X = P.x();

        for (int i = 0; i < Num_Segments; i++)
        {
            if (X > Points[i].x() && X < Points[i + 1].x() ||
                fabs(X - Points[i].x()) < eps ||
                fabs(X - Points[i + 1].x()) < eps) {

                double h = Points[i + 1].x() - Points[i].x();
                double Ksi;
                Transition_To_Master_Element(i, X, Ksi);
                Res[0] = alpha[i]      * Basis_Function(1, Ksi) +
                         alpha[i + 1]  * Basis_Function(2, Ksi);
                Res[1] = (alpha[i]     * Der_Basis_Function(1, Ksi) +
                         alpha[i + 1] * Der_Basis_Function(2, Ksi)) * 2.0 / h;
                Res[2] = 0.0;
                return;
            }
        }
        throw std::runtime_error("The point is not found in the segments...");
    }
}