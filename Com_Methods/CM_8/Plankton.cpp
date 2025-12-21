#include <iostream>
#include <fstream>
#include <vector>
#include <iomanip>
#include <string>
using namespace std;

// Модель 1: Фитопланктон (жертва) — Зоопланктон (хищник)
constexpr double ALPHA = 1.5;    // быстрый рост фитопланктона
constexpr double BETA  = 0.02;
constexpr double GAMMA = 0.8;
constexpr double DELTA = 0.01;

constexpr double X_EQ = GAMMA / DELTA;  // 80
constexpr double Y_EQ = ALPHA / BETA;   // 75

constexpr double TOTAL_TIME = 200.0;   // 200 дней
constexpr double H_RK4 = 0.01;           // шаг RK4
constexpr double H_AB  = 0.01;           // шаг AB2

constexpr int NUM_STEPS_RK4 = static_cast<int>(TOTAL_TIME / H_RK4);  
constexpr int NUM_STEPS_AB  = static_cast<int>(TOTAL_TIME / H_AB);  

double dx_dt(double x, double y) { return (ALPHA - BETA * y) * x; }
double dy_dt(double x, double y) { return (-GAMMA + DELTA * x) * y; }

// RK4 с заданным суффиксом и начальными условиями
void solve_rk4(const string& suffix, double x0, double y0) {
    ofstream prey_out("prey_" + suffix + "_rk4.txt");
    ofstream pred_out("pred_" + suffix + "_rk4.txt");
    ofstream phase_out("phase_" + suffix + "_rk4.txt");

    double x = x0, y = y0;
    double h = H_RK4;

    prey_out  << fixed << setprecision(6) << x << "\n";
    pred_out  << y << "\n";
    phase_out << x << " " << y << "\n";

    for (int i = 0; i < NUM_STEPS_RK4; ++i) {
        double k1x = h * dx_dt(x, y);
        double k1y = h * dy_dt(x, y);
        double k2x = h * dx_dt(x + k1x/2, y + k1y/2);
        double k2y = h * dy_dt(x + k1x/2, y + k1y/2);
        double k3x = h * dx_dt(x + k2x/2, y + k2y/2);
        double k3y = h * dy_dt(x + k2x/2, y + k2y/2);
        double k4x = h * dx_dt(x + k3x, y + k3y);
        double k4y = h * dy_dt(x + k3x, y + k3y);

        x += (k1x + 2*k2x + 2*k3x + k4x) / 6.0;
        y += (k1y + 2*k2y + 2*k3y + k4y) / 6.0;

        prey_out  << x << "\n";
        pred_out  << y << "\n";
        phase_out << x << " " << y << "\n";
    }
    prey_out.close(); pred_out.close(); phase_out.close();
    cout << "RK4 (" << suffix << ") завершён: " << NUM_STEPS_RK4 + 1 << " точек\n";
}

// Adams-Bashforth 2 с заданным суффиксом и начальными условиями
void solve_ab2(const string& suffix, double x0, double y0) {
    ofstream prey_out("prey_" + suffix + "_ab2.txt");
    ofstream pred_out("pred_" + suffix + "_ab2.txt");
    ofstream phase_out("phase_" + suffix + "_ab2.txt");

    vector<double> x_vec, y_vec;
    double h = H_AB;

    x_vec.push_back(x0);
    y_vec.push_back(y0);

    // Первый шаг RK4
    double k1x = h * dx_dt(x0, y0);
    double k1y = h * dy_dt(x0, y0);
    double k2x = h * dx_dt(x0 + k1x/2, y0 + k1y/2);
    double k2y = h * dy_dt(x0 + k1x/2, y0 + k1y/2);
    double k3x = h * dx_dt(x0 + k2x/2, y0 + k2y/2);
    double k3y = h * dy_dt(x0 + k2x/2, y0 + k2y/2);
    double k4x = h * dx_dt(x0 + k3x, y0 + k3y);
    double k4y = h * dy_dt(x0 + k3x, y0 + k3y);

    double x1 = x0 + (k1x + 2*k2x + 2*k3x + k4x)/6.0;
    double y1 = y0 + (k1y + 2*k2y + 2*k3y + k4y)/6.0;

    x_vec.push_back(x1);
    y_vec.push_back(y1);

    prey_out  << fixed << setprecision(6) << x_vec[0] << "\n" << x_vec[1] << "\n";
    pred_out  << y_vec[0] << "\n" << y_vec[1] << "\n";
    phase_out << x_vec[0] << " " << y_vec[0] << "\n" << x_vec[1] << " " << y_vec[1] << "\n";

    for (int i = 1; i < NUM_STEPS_AB; ++i) {
        double fx_n  = dx_dt(x_vec[i], y_vec[i]);
        double fx_m1 = dx_dt(x_vec[i-1], y_vec[i-1]);
        double fy_n  = dy_dt(x_vec[i], y_vec[i]);
        double fy_m1 = dy_dt(x_vec[i-1], y_vec[i-1]);

        double x_new = x_vec[i] + h * (1.5 * fx_n - 0.5 * fx_m1);
        double y_new = y_vec[i] + h * (1.5 * fy_n - 0.5 * fy_m1);

        x_vec.push_back(x_new);
        y_vec.push_back(y_new);

        prey_out  << x_new << "\n";
        pred_out  << y_new << "\n";
        phase_out << x_new << " " << y_new << "\n";
    }
    prey_out.close(); pred_out.close(); phase_out.close();
    cout << "AB2 (" << suffix << ") завершён: " << NUM_STEPS_AB + 1 << " точек\n";
}

int main() {
    cout << "=== Модель 1: Фитопланктон — Зоопланктон (быстрые колебания) ===\n";
    cout << "Равновесие: фитопланктон = " << X_EQ << ", зоопланктон = " << Y_EQ << "\n\n";

    // 1. Базовый сценарий
    solve_rk4("base", X_EQ, Y_EQ);
    solve_ab2("base", X_EQ, Y_EQ);

    // 2. Избыток кормовой базы (много жертв)
    solve_rk4("excess_prey", 10 * X_EQ, 0.5 * Y_EQ);
    solve_ab2("excess_prey", 10 * X_EQ, 0.5 * Y_EQ);

    // 3. Избыток хищников
    solve_rk4("excess_pred", 0.5 * X_EQ, 10 * Y_EQ);
    solve_ab2("excess_pred", 0.5 * X_EQ, 10 * Y_EQ);

    cout << "\nВсе симуляции завершены. Файлы созданы для RK4 и AB2 в каждом сценарии.\n";
    return 0;
}