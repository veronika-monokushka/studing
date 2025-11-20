#include <iostream>
#include <iomanip>
#include <functional>
#include <cmath>
#include "Point.h"
#include "Integration_forms.h"

int main()
{
	//подынтегральная функция f(x) = sin(x)
	std::function<double(const Com_Methods::Point &P)> f = 
	[](const Com_Methods::Point &P) { return sin(P.x()); };

	//первообразная F(x) = -cos(x)
	std::function<double(const Com_Methods::Point &P)> F =
	[](const Com_Methods::Point &P) { return -cos(P.x()); };

	//квадратурная формула Гаусс-3
	Com_Methods::Integration_Scheme_Interval Form_Gauss(Com_Methods::Integration_Scheme::Gauss3);
	//квадратурная формула Метод Симпсона
	Com_Methods::Integration_Scheme_Interval Form_Simpson(Com_Methods::Integration_Scheme::Simpson);


	//начало и конец отрезка интегрирования
	auto Begin = Com_Methods::Point(0.05, 0, 0);
	auto End   = Com_Methods::Point(0.66, 0, 0);

	int Num_Segments[] = {5, 10, 20};
	double I_values[3];
	
	double I_true = F(End) - F(Begin);
	std::cout << std::scientific;

	for (int i=0; i<3; i++) {
		
		I_values[i] = Form_Gauss.Calculate_Integral(Begin, End, Num_Segments[i], f);

		std::cout << "h  = " << (End.x() - Begin.x()) / Num_Segments[i] << std::endl;
		std::cout << "I  = " << I_values[i] << std::endl;
		std::cout << "|I - I*| = " << std::fabs(I_values[i] - I_true) << std::endl << std::endl;
	}

	double k = std::fabs(1 + (I_values[2] - I_values[1]) / (I_true - I_values[2]));
	k = std::log2(k);
	std::cout << "k  = " << k << std::endl;

	double l3 = (I_values[1] - I_true) / (I_values[2] - I_true);
	double l4 = (I_values[2] - I_values[1]) / (std::pow(2, k) - 1);
	double I_R = I_values[2] + l4;
	double l6 = I_true - I_R;

	std::cout << "l3        = " << l3 << std::endl;
	std::cout << "l4        = " << l4 << std::endl;
	std::cout << "I_R       = " << I_R << std::endl;
	std::cout << "I* - I_R  = " << l6 << std::endl;

}
