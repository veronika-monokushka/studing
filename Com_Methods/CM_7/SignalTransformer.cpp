#include "SignalTransformer.h"
#include "MathConstants.h"
#include <cmath>

namespace SignalProcessing
{
    void SignalTransformer::FastFourierTransform(const std::vector<std::complex<double>>& input,
        std::vector<std::complex<double>>& output)
    {
        int size = (int)input.size();
        int halfSize = size / 2;
        output.assign(size, std::complex<double>(0.0, 0.0));

        std::complex<double> exponent, U_part, V_part;

        for (int m = 0; m < halfSize; m++)
        {
            U_part = { 0.0, 0.0 };
            V_part = { 0.0, 0.0 };

            for (int n = 0; n < halfSize; n++)
            {
                exponent = { std::cos(-Constants::TWO_PI * m * n / halfSize),
                           std::sin(-Constants::TWO_PI * m * n / halfSize) };
                U_part += input[2 * n] * exponent;
                V_part += input[2 * n + 1] * exponent;
            }

            exponent = { std::cos(-Constants::TWO_PI * m / size),
                       std::sin(-Constants::TWO_PI * m / size) };
            output[m] = U_part + exponent * V_part;
            output[m + halfSize] = U_part - exponent * V_part;
        }
    }

    void SignalTransformer::InverseFastFourierTransform(const std::vector<std::complex<double>>& input,
        std::vector<std::complex<double>>& output)
    {
        int size = (int)input.size();
        FastFourierTransform(input, output);

        std::complex<double> tempValue;
        for (int i = 1; i <= size / 2; i++)
        {
            tempValue = output[i];
            output[i] = output[size - i] / double(size);
            output[size - i] = tempValue / double(size);
        }
        output[0] /= double(size);
    }

    void SignalTransformer::ComputeConvolution(const std::vector<std::complex<double>>& vector1,
        const std::vector<std::complex<double>>& vector2,
        std::vector<std::complex<double>>& result)
    {
        int size = (int)vector1.size();
        std::vector<std::complex<double>> intermediate(size);

        result.clear();
        result.resize(size);

        FastFourierTransform(vector1, result);
        FastFourierTransform(vector2, intermediate);

        for (int i = 0; i < size; i++)
            intermediate[i] *= result[i];

        InverseFastFourierTransform(intermediate, result);
    }
}