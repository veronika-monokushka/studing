#pragma once

namespace Com_Methods
{
	class Point
	{
	private:
		double X, Y, Z;
	public:
		Point(double x, double y, double z);
		double x()const;
		double y()const;
		double z()const;
	};
}

