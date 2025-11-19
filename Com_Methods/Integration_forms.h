#pragma once
#include "Integration_Scheme.h"
#include <functional>

namespace Com_Methods
{
	class Integration_Scheme_Interval : protected Integration_Scheme
	{
	public:
		Integration_Scheme_Interval(Integration_Scheme_Type Type);
		double Calculate_Integral(const Point &Begin, 
								  const Point &End, 
								  int Number_Segments,
								  const std::function<double(const Point &P)>&Func) const;
	};
}

