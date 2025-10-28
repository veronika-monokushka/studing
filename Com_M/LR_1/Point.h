#pragma once
#ifndef Point_h
#define Point_h

namespace Com_Methods {
    class Point
    {
    private:
        double X, Y, Z;
    public:
        Point(double x = 0, double y = 0, double z = 0);  // Значения по умолчанию здесь
        double x() const;
        double y() const;
        double z() const;
    };
}

#endif