#include <iostream>
#include <vector>
#include <complex>
#include <cmath>
#include <random>
#include <string>
#include <fstream>
#include <iomanip>
#include <chrono>

#include "WaveletProcessor.h"
#include "MathConstants.h"
constexpr double PI = 3.14159265358979323846;

static void SaveSignalToCSV(const std::string& filepath, const std::vector<std::complex<double>>& signal)
{
    std::ofstream file(filepath);
    file << "index,real_part,imag_part\n";
    for (int i = 0; i < (int)signal.size(); i++)
        file << i << "," << std::setprecision(17) << signal[i].real() << "," << signal[i].imag() << "\n";
}

static void SaveCoefficientsToCSV(const std::string& filepath, int stage,
    const std::vector<std::complex<double>>& psiCoeffs,
    const std::vector<std::complex<double>>& phiCoeffs)
{
    std::ofstream file(filepath);
    file << "k,index,psi_real,psi_imag,phi_real,phi_imag,psi_magnitude,phi_magnitude\n";
    for (int k = 0; k < (int)psiCoeffs.size(); k++)
    {
        int idx = (int)(std::pow(2.0, stage) * k);
        file << k << "," << idx << ","
            << std::setprecision(17) << psiCoeffs[k].real() << "," << psiCoeffs[k].imag() << ","
            << phiCoeffs[k].real() << "," << phiCoeffs[k].imag() << ","
            << std::abs(psiCoeffs[k]) << "," << std::abs(phiCoeffs[k]) << "\n";
    }
}

static void SaveFilterResultsToCSV(const std::string& filepath,
    const std::vector<std::complex<double>>& original,
    const std::vector<std::complex<double>>& filtered,
    const std::vector<std::complex<double>>& difference)
{
    std::ofstream file(filepath);
    file << "index,original_real,filtered_real,difference_real\n";
    for (int i = 0; i < (int)original.size(); i++)
        file << i << "," << std::setprecision(17)
        << original[i].real() << ","
        << filtered[i].real() << ","
        << difference[i].real() << "\n";
}

static void SavePQComponentsToCSV(const std::string& filepath,
    const std::vector<std::complex<double>>& PComponent,
    const std::vector<std::complex<double>>& QComponent)
{
    std::ofstream file(filepath);
    file << "index,P_real,Q_real\n";
    for (int i = 0; i < (int)PComponent.size(); i++)
        file << i << "," << std::setprecision(17)
        << PComponent[i].real() << ","
        << QComponent[i].real() << "\n";
}

static std::string GetWaveletName(SignalProcessing::WaveletProcessor::WaveletType type)
{
    using WT = SignalProcessing::WaveletProcessor::WaveletType;
    if (type == WT::Haar) return "haar";
    if (type == WT::Shannon) return "shannon";
    return "d6";
}

static void ComputeOnlyPComponent(SignalProcessing::WaveletProcessor& processor,
    int stage,
    const std::vector<std::complex<double>>& signal,
    std::vector<std::complex<double>>& PComponent)
{
    std::vector<std::complex<double>> psiCoeffs, phiCoeffs;
    processor.PerformDecomposition(stage, signal, psiCoeffs, phiCoeffs);

    std::vector<std::complex<double>> zeroedPsi(psiCoeffs.size(), { 0.0, 0.0 });
    std::vector<std::complex<double>> tempP, tempQ, tempRecovery;
    processor.PerformReconstruction(stage, zeroedPsi, phiCoeffs, tempP, tempQ, tempRecovery);
    PComponent = tempP;
}

static void ProcessWaveletBasis(const std::string& outputDirectory,
    SignalProcessing::WaveletProcessor::WaveletType type,
    const std::vector<std::complex<double>>& inputSignal,
    int maxStages)
{
    int N = (int)inputSignal.size();
    SignalProcessing::WaveletProcessor processor(N, type);
    std::string basisName = GetWaveletName(type);

    for (int level = 1; level <= maxStages; level++)
    {
        std::vector<std::complex<double>> psiCoeffs, phiCoeffs;
        processor.PerformDecomposition(level, inputSignal, psiCoeffs, phiCoeffs);

        SaveCoefficientsToCSV(outputDirectory + "/coeffs_before_" + basisName + "_stage" + std::to_string(level) + ".csv",
            level, psiCoeffs, phiCoeffs);

        std::vector<std::complex<double>> zeroedPsi(psiCoeffs.size(), { 0.0, 0.0 });
        SaveCoefficientsToCSV(outputDirectory + "/coeffs_after_" + basisName + "_stage" + std::to_string(level) + ".csv",
            level, zeroedPsi, phiCoeffs);

        std::vector<std::complex<double>> PComp, QComp, filteredSignal;
        processor.PerformReconstruction(level, zeroedPsi, phiCoeffs, PComp, QComp, filteredSignal);

        std::vector<std::complex<double>> difference(N);
        for (int i = 0; i < N; i++)
            difference[i] = inputSignal[i] - filteredSignal[i];

        SaveFilterResultsToCSV(outputDirectory + "/filter_results_" + basisName + "_stage" + std::to_string(level) + ".csv",
            inputSignal, filteredSignal, difference);

        std::vector<std::complex<double>> previousP(N), previousQ(N);
        if (level == 1)
        {
            previousP = filteredSignal;
            for (int i = 0; i < N; i++)
                previousQ[i] = { 0.0, 0.0 };
        }
        else
        {
            ComputeOnlyPComponent(processor, level - 1, filteredSignal, previousP);
            for (int i = 0; i < N; i++)
                previousQ[i] = filteredSignal[i] - previousP[i];
        }

        SavePQComponentsToCSV(outputDirectory + "/pq_components_" + basisName + "_stage" + std::to_string(level) + ".csv",
            previousP, previousQ);
    }
}


std::vector<std::complex<double>> generateSignal(size_t N, double A, double B, double w2)
{
    std::vector<std::complex<double>> signal(N, { 0.0, 0.0 });

    // Лучше использовать современный ГСЧ вместо srand/rand
    unsigned seed = std::chrono::steady_clock::now().time_since_epoch().count();
    std::mt19937 gen(seed);
    // Если нужна детерминированность — закомментировать строку выше и использовать фиксированный seed

    const double quarter = N / 4.0;
    const double three_quarters = 3.0 * N / 4.0;

    for (size_t j = 0; j < N; ++j) {
        if ((j >= quarter && j <= N / 2.0) || (j > three_quarters)) {
            double valS = A + B * std::cos(2.0 * PI * w2 * j / N);
            signal[j] = { valS, 0.0 };
        }
        else {
            signal[j] = { 0.0, 0.0 };
        }
    }

        return signal;
    }

int main() {
    system("chcp 65001 > nul"); // Устанавливаем UTF-8 в консоли Windows

    using namespace SignalProcessing;
    const int n = 9;
    const int N = 1 << n; // = 512

    const double A = 2.29;
    const double B = 0.22;
    const int w1 = 1;
    const int w2 = 192; 
    const int maxStages = 4;

    const std::string outputDirectory = "C:\\VERONIKA\\Studies\\Labs\\Programm files";


    // Генерация вариант 1:
    // std::vector<std::complex<double>> signal = generateSignal(N, A, B, w2);

    // Генерация вариант 2:
    
    std::mt19937 randomGenerator(42);
    const double phi = 0.0; // добавить фазу
    std::vector<std::complex<double>> signal(N, { 0.0, 0.0 });
    std::uniform_real_distribution<double> noiseDistribution(-0.05, 0.05);

    for (int j = 0; j < N; j++)
    {
        // z(j) = A cos(2π ω₁ j / N + φ) + B cos(2π ω₂ j / N)
        double cleanSignal = A * std::cos(Constants::TWO_PI * w1 * j / N + phi)
            + B * std::cos(Constants::TWO_PI * w2 * j / N);

        double noise = noiseDistribution(randomGenerator);
        signal[j] = { cleanSignal + noise, 0.0 };
    }
    


    SaveSignalToCSV(outputDirectory + "/generated_signal.csv", signal);

    // Обработка для всех трех базисов
    ProcessWaveletBasis(outputDirectory,
        WaveletProcessor::WaveletType::Haar,
        signal, maxStages);

    ProcessWaveletBasis(outputDirectory,
        WaveletProcessor::WaveletType::Shannon,
        signal, maxStages);

    ProcessWaveletBasis(outputDirectory,
        WaveletProcessor::WaveletType::Daubechies6,
        signal, maxStages);

    std::cout << "Файлы сохранены в: " << outputDirectory << std::endl;

    return 0;

}