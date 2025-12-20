#pragma once
#ifndef SIGNAL_TRANSFORMER_H
#define SIGNAL_TRANSFORMER_H

#include <vector>
#include <complex>

namespace SignalProcessing
{
    class SignalTransformer
    {
    public:
        // ������� �������������� �����
        void FastFourierTransform(const std::vector<std::complex<double>>& input,
            std::vector<std::complex<double>>& output);

        // �������� ������� �������������� �����
        void InverseFastFourierTransform(const std::vector<std::complex<double>>& input,
            std::vector<std::complex<double>>& output);

        // ���������� �������
        void ComputeConvolution(const std::vector<std::complex<double>>& vector1,
            const std::vector<std::complex<double>>& vector2,
            std::vector<std::complex<double>>& result);
    };
}

#endif