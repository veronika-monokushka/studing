#include "Point.h"
#include "Integration_forms.h"
#include <cmath>

namespace Com_Methods
{
	Integration_Scheme_Interval::Integration_Scheme_Interval(Integration_Scheme_Type Type)
	{
		switch (Type)
		{
			case Gauss1: // метод прям.
			{
				Weight = { 2 };
				Points = {Point(0, 0, 0) };
				break;
			}

			case Simpson:  // метод Симпсона
			{
				Weight = { 1.0/3.0, 4.0/3.0, 1.0/3.0 };
				Points = { 
					Point(-1, 0, 0),  // левая точка
					Point(0, 0, 0),   // средняя точка  
					Point(1, 0, 0)    // правая точка
				};
				break;
			}

			case Gauss3: // Гаусс-3
			{
				Weight = { 5.0/9.0, 8.0/9.0, 5.0/9.0 };
				Points = { 
					Point(-std::sqrt(3.0/5.0), 0, 0),  // левая точка
					Point(0, 0, 0),   // средняя точка  
					Point(std::sqrt(3.0/5.0), 0, 0)    // правая точка
				};
				break;
			}
		}
	}

	double Integration_Scheme_Interval::Calculate_Integral(
								         const Point &Begin,
								         const Point &End,
								         int Number_Segments,
								         const std::function<double(const Point &P)>&Func) const
	{
		double Result = 0.0;
		double X0;
		double h = (End.x() - Begin.x()) / Number_Segments;
		
		for (int i = 0; i < Number_Segments; i++)
		{
			X0 = Begin.x() + i * h;
			
			for (int Integ_Point = 0; Integ_Point < Points.size(); Integ_Point++)
			{
				// Преобразование из [-1, 1] в [X0, X0+h]
				auto P = Point(X0 + (1 + Points[Integ_Point].x()) * h / 2.0, 0, 0);
				Result += Weight[Integ_Point] * Func(P);
			}
		}
		
		// Масштабирующий коэффициент для перехода от [-1, 1] к реальному отрезку
		return Result * (h / 2.0);
	}
}
