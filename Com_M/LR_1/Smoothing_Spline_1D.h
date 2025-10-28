#pragma once
#ifndef Smoothing_Spline_1D_h
#define Smoothing_Spline_1D_h

#include "Spline.h"

namespace Com_Methods {

	class Smoothing_Spline_1D : public Spline
	{
	private:
		double SMOOTH;
		double W;
		std::vector<Point> Points;
		std::vector<double> alpha;
		void Transition_To_Master_Element(int Seg_Num, const double &X, double &Ksi) const;
		//[-1, 1]:
		//Number - , Ksi - 
		double Basis_Function(int Number, const double &Ksi) const;
		//[-1, 1]:
		//Number - , Ksi -
		double Der_Basis_Function(int Number, const double & Ksi) const;
	public:
		//: SMOOTH -
		Smoothing_Spline_1D(const double &SMOOTH, const double &W);
		void Update_Spline(const std::vector<Point> &Points, const std::vector<double> &F_Value) override;
		void Get_Value(const Point &P, double * Res)const override;
	};
}

#endif