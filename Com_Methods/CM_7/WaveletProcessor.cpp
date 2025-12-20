#include "WaveletProcessor.h"
#include "MathConstants.h"
#include "SignalOperations.h"
#include "SignalTransformer.h"
#include <cmath>
#include <stdexcept>

namespace SignalProcessing
{
    // ��������������� ������� ��� ����������� ���������� ������� �� ������
    static int wrapIndex(int a, int n)
    {
        int r = a % n;
        return (r < 0) ? (r + n) : r;
    }

    // �����������: �������� �������� ��� ���������� ���� ��������
    WaveletProcessor::WaveletProcessor(int dataSize, WaveletType type)
    {
        int N = dataSize;
        lowpassFilter.assign(N, std::complex<double>(0.0, 0.0));
        highpassFilter.assign(N, std::complex<double>(0.0, 0.0));

        switch (type)
        {
        case WaveletType::Shannon:
        {
            if (N % 4 != 0)
                throw std::runtime_error("��� ������ ������� N ������ ���� ������ 4");

            double sqrt2 = 1.0 / std::sqrt(2.0);
            lowpassFilter[0] = std::complex<double>(sqrt2, 0.0);
            highpassFilter[0] = std::complex<double>(sqrt2, 0.0);

            for (int i = 1; i < N; i++)
            {
                double denominator = std::sin(Constants::PI * i / N);
                if (std::abs(denominator) < 1e-10)
                {
                    lowpassFilter[i] = std::complex<double>(0.0, 0.0);
                    highpassFilter[i] = std::complex<double>(0.0, 0.0);
                    continue;
                }

                double realPart = std::sqrt(2.0) / N * std::cos(Constants::PI * i / N) *
                    std::sin(Constants::PI * i / 2.0) / denominator;
                double imagPart = -std::sqrt(2.0) / N * std::sin(Constants::PI * i / N) *
                    std::sin(Constants::PI * i / 2.0) / denominator;

                std::complex<double> value(realPart, imagPart);
                lowpassFilter[i] = value;
                highpassFilter[i] = std::complex<double>(((i % 2 == 0) ? 1 : -1) * value.real(),
                    ((i % 2 == 0) ? 1 : -1) * value.imag());
            }
            break;
        }
        case WaveletType::Haar:
        {
            double scale = 1.0 / std::sqrt(2.0);
            lowpassFilter[0] = std::complex<double>(scale, 0.0);
            lowpassFilter[1] = std::complex<double>(scale, 0.0);
            highpassFilter[0] = std::complex<double>(scale, 0.0);
            highpassFilter[1] = std::complex<double>(-scale, 0.0);
            break;
        }
        case WaveletType::Daubechies6:
        {
            const double filterCoeffs[6] = {
                0.3326705529500826,
                0.8068915093110928,
                0.4598775021184915,
                -0.1350110200102546,
                -0.08544127388202666,
                0.03522629188570953
            };

            for (int i = 0; i < 6; i++)
            {
                lowpassFilter[i] = std::complex<double>(filterCoeffs[i], 0.0);
            }

            for (int k = 0; k < N; k++)
            {
                int idx = wrapIndex(1 - k, N);
                double sign = (k % 2 == 0) ? -1.0 : 1.0;
                highpassFilter[k] = std::complex<double>(sign * lowpassFilter[idx].real(), 0.0);
            }
            break;
        }
        default:
            throw std::runtime_error("����������� ��� ��������");
        }
    }

    // ���������� ������� �������� ��� ��������� ���������� ������
    void WaveletProcessor::BuildFilterSystem(int stages)
    {
        SignalOperations operations;
        int N = (int)lowpassFilter.size();

        std::vector<std::vector<std::complex<double>>> lowFilters(stages);
        std::vector<std::vector<std::complex<double>>> highFilters(stages);

        lowFilters[0] = lowpassFilter;
        highFilters[0] = highpassFilter;

        for (int i = 1; i < stages; i++)
        {
            int elementCount = N / (int)std::pow(2.0, i);
            lowFilters[i].assign(elementCount, std::complex<double>(0.0, 0.0));
            highFilters[i].assign(elementCount, std::complex<double>(0.0, 0.0));

            for (int n = 0; n < elementCount; n++)
            {
                int maxIdx = (int)std::pow(2.0, i);
                for (int k = 0; k < maxIdx; k++)
                {
                    lowFilters[i][n] += lowFilters[0][n + k * N / maxIdx];
                    highFilters[i][n] += highFilters[0][n + k * N / maxIdx];
                }
            }
        }

        SignalTransformer transformer;
        std::vector<std::complex<double>> upsampledLow, upsampledHigh;

        decompositionFilters.resize(stages);
        reconstructionFilters.resize(stages);

        decompositionFilters[0] = highFilters[0];
        reconstructionFilters[0] = lowFilters[0];

        for (int i = 1; i < stages; i++)
        {
            operations.ApplyUpsampling(i, lowFilters[i], upsampledLow);
            operations.ApplyUpsampling(i, highFilters[i], upsampledHigh);

            transformer.ComputeConvolution(reconstructionFilters[i - 1], upsampledHigh, decompositionFilters[i]);
            transformer.ComputeConvolution(reconstructionFilters[i - 1], upsampledLow, reconstructionFilters[i]);
        }
    }

    // ��������� �������� ������� ��� ��������� �����
    void WaveletProcessor::GenerateBasisFunctions(int stage,
        std::vector<std::vector<std::complex<double>>>& waveletBasis,
        std::vector<std::vector<std::complex<double>>>& scalingBasis)
    {
        SignalOperations operations;

        int dataSize = (int)lowpassFilter.size();
        int basisElements = dataSize / (int)std::pow(2.0, stage);

        if ((int)reconstructionFilters.size() < stage)
        {
            BuildFilterSystem(stage + 1);
        }

        waveletBasis.resize(basisElements);
        scalingBasis.resize(basisElements);

        for (int i = 0; i < basisElements; i++)
        {
            int shiftAmount = (int)std::pow(2.0, stage) * i;

            std::vector<std::complex<double>> shiftedWavelet;
            operations.PerformCircularShift(shiftAmount, decompositionFilters[stage - 1], shiftedWavelet);
            waveletBasis[i] = shiftedWavelet;

            std::vector<std::complex<double>> shiftedScaling;
            operations.PerformCircularShift(shiftAmount, reconstructionFilters[stage - 1], shiftedScaling);
            scalingBasis[i] = shiftedScaling;
        }
    }

    // ���� �������: ���������� ������� �� ������������
    void WaveletProcessor::PerformDecomposition(int stage,
        const std::vector<std::complex<double>>& inputSignal,
        std::vector<std::complex<double>>& waveletCoeffs,
        std::vector<std::complex<double>>& scalingCoeffs)
    {
        SignalOperations operations;

        std::vector<std::vector<std::complex<double>>> waveletBasis, scalingBasis;
        GenerateBasisFunctions(stage, waveletBasis, scalingBasis);

        int basisElements = (int)waveletBasis.size();
        waveletCoeffs.assign(basisElements, std::complex<double>(0.0, 0.0));
        scalingCoeffs.assign(basisElements, std::complex<double>(0.0, 0.0));

        for (int basisIdx = 0; basisIdx < basisElements; basisIdx++)
        {
            waveletCoeffs[basisIdx] = operations.ComputeDotProduct(inputSignal, waveletBasis[basisIdx]);
            scalingCoeffs[basisIdx] = operations.ComputeDotProduct(inputSignal, scalingBasis[basisIdx]);
        }
    }

    // ���� �������: �������������� ������� �� �������������
    void WaveletProcessor::PerformReconstruction(int stage,
        const std::vector<std::complex<double>>& waveletCoeffs,
        const std::vector<std::complex<double>>& scalingCoeffs,
        std::vector<std::complex<double>>& lowpassPart,
        std::vector<std::complex<double>>& highpassPart,
        std::vector<std::complex<double>>& reconstructedSignal)
    {
        std::vector<std::vector<std::complex<double>>> waveletBasis, scalingBasis;
        GenerateBasisFunctions(stage, waveletBasis, scalingBasis);

        int basisElements = (int)waveletBasis.size();
        int dataSize = (int)lowpassFilter.size();

        lowpassPart.assign(dataSize, std::complex<double>(0.0, 0.0));
        highpassPart.assign(dataSize, std::complex<double>(0.0, 0.0));
        reconstructedSignal.assign(dataSize, std::complex<double>(0.0, 0.0));

        for (int dataIdx = 0; dataIdx < dataSize; dataIdx++)
        {
            std::complex<double> lowpassComponent(0.0, 0.0);
            std::complex<double> highpassComponent(0.0, 0.0);

            for (int basisIdx = 0; basisIdx < basisElements; basisIdx++)
            {
                lowpassComponent = lowpassComponent + (scalingCoeffs[basisIdx] * scalingBasis[basisIdx][dataIdx]);
                highpassComponent = highpassComponent + (waveletCoeffs[basisIdx] * waveletBasis[basisIdx][dataIdx]);
            }

            lowpassPart[dataIdx] = lowpassComponent;
            highpassPart[dataIdx] = highpassComponent;
            reconstructedSignal[dataIdx] = lowpassComponent + highpassComponent;
        }
    }
}