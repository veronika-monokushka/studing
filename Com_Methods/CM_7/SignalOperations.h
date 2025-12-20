#pragma once
#ifndef SIGNAL_OPERATIONS_H
#define SIGNAL_OPERATIONS_H

#include <complex>
#include <vector>

namespace SignalProcessing
{
    class SignalOperations
    {
    public:
        // ��������� ����������� ����� �������
        void PerformCircularShift(int shiftAmount,
            const std::vector<std::complex<double>>& data,
            std::vector<std::complex<double>>& result);

        // ��������� ������������ (downsampling)
        void ApplyDownsampling(int level,
            const std::vector<std::complex<double>>& data,
            std::vector<std::complex<double>>& result);

        // ��������� ������������ (upsampling)
        void ApplyUpsampling(int level,
            const std::vector<std::complex<double>>& data,
            std::vector<std::complex<double>>& result);

        // ��������� ��������� ������������
        std::complex<double> ComputeDotProduct(const std::vector<std::complex<double>>& vec1,
            const std::vector<std::complex<double>>& vec2);
    };
}

#endif