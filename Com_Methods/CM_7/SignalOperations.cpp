#include "SignalOperations.h"
#include <cmath>

namespace SignalProcessing
{
    void SignalOperations::PerformCircularShift(int shiftAmount,
        const std::vector<std::complex<double>>& data,
        std::vector<std::complex<double>>& result)
    {
        int size = (int)data.size();
        result.assign(size, std::complex<double>(0.0, 0.0));

        for (int i = 0; i < size; i++)
        {
            int shiftedIndex = i - shiftAmount;
            if (shiftedIndex < 0) shiftedIndex += size;
            result[i] = data[shiftedIndex];
        }
    }

    void SignalOperations::ApplyDownsampling(int level,
        const std::vector<std::complex<double>>& data,
        std::vector<std::complex<double>>& result)
    {
        int factor = (int)std::pow(2.0, level);
        int newSize = (int)data.size() / factor;
        result.assign(newSize, std::complex<double>(0.0, 0.0));

        for (int i = 0; i < newSize; i++)
            result[i] = data[i * factor];
    }

    void SignalOperations::ApplyUpsampling(int level,
        const std::vector<std::complex<double>>& data,
        std::vector<std::complex<double>>& result)
    {
        int factor = (int)std::pow(2.0, level);
        int newSize = (int)data.size() * factor;
        result.assign(newSize, std::complex<double>(0.0, 0.0));

        for (int i = 0; i < newSize; i++)
        {
            if (i % factor == 0)
                result[i] = data[i / factor];
            else
                result[i] = std::complex<double>(0.0, 0.0);
        }
    }

    std::complex<double> SignalOperations::ComputeDotProduct(const std::vector<std::complex<double>>& vec1,
        const std::vector<std::complex<double>>& vec2)
    {
        int size = (int)vec1.size();
        std::complex<double> result(0.0, 0.0);

        for (int i = 0; i < size; i++)
            result += vec1[i] * std::conj(vec2[i]);

        return result;
    }
}