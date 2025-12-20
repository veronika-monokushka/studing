#pragma once
#ifndef WAVELET_PROCESSOR_H
#define WAVELET_PROCESSOR_H

#include <vector>
#include <complex>
#include "SignalOperations.h"
#include "SignalTransformer.h"

namespace SignalProcessing
{
    class WaveletProcessor
    {
    private:
        std::vector<std::complex<double>> lowpassFilter, highpassFilter;
        std::vector<std::vector<std::complex<double>>> decompositionFilters, reconstructionFilters;

    public:
        enum class WaveletType
        {
            Haar = 1,
            Shannon = 2,
            Daubechies6 = 3
        };

        WaveletProcessor(int dataSize, WaveletType type);

    private:
        void BuildFilterSystem(int stages);

        void GenerateBasisFunctions(int stage,
            std::vector<std::vector<std::complex<double>>>& waveletBasis,
            std::vector<std::vector<std::complex<double>>>& scalingBasis);

    public:
        void PerformDecomposition(int stage,
            const std::vector<std::complex<double>>& inputSignal,
            std::vector<std::complex<double>>& waveletCoeffs,
            std::vector<std::complex<double>>& scalingCoeffs);

        void PerformReconstruction(int stage,
            const std::vector<std::complex<double>>& waveletCoeffs,
            const std::vector<std::complex<double>>& scalingCoeffs,
            std::vector<std::complex<double>>& lowpassPart,
            std::vector<std::complex<double>>& highpassPart,
            std::vector<std::complex<double>>& reconstructedSignal);
    };
}

#endif