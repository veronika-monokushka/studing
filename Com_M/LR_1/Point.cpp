#include "Point.h"

namespace Com_Methods {

    Point::Point(double x, double y, double z) : X(x), Y(y), Z(z) {}
    double Point::x() const { return X; }
    double Point::y() const { return Y; }
    double Point::z() const { return Z; }
}
