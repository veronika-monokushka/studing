#include <iostream>
#include <vector>
#include <complex>
#include <cmath>
#include <iomanip>
#include <fstream>
#include <functional>
using namespace std;

#ifndef M_PI
    #define M_PI 3.14159265358979323846
#endif


class SignalProcessor {
private:
	int numSamples;

	double signOf(double value) const {
		return (value < 0.0) ? -1.0 : 1.0;
	}

public:
	vector<complex<double>> signal, spectrum, restoredSignal;

	double extractAmplitude(const complex<double>& comp) const {
		return sqrt(comp.real() * comp.real() + comp.imag() * comp.imag());
	}

	double extractPhase(const complex<double>& comp) const {
		if (comp.real() > 0.0)
			return atan(comp.imag() / comp.real());
		if (comp.real() == 0.0)
			return signOf(comp.imag()) * M_PI / 2.0;
		return comp.imag() >= 0.0
			? M_PI + atan(comp.imag() / comp.real())
			: atan(comp.imag() / comp.real()) - M_PI;
	}

	SignalProcessor(int samples) {
		numSamples = samples;
		signal.resize(samples);
		spectrum.resize(samples);
		restoredSignal.resize(samples);
	}

	void suppressNoise() {
		double peakAmp = -1e10;
		for (const auto& val : spectrum) {
			peakAmp = max(peakAmp, extractAmplitude(val));
		}
		for (auto& val : spectrum) {
			if (extractAmplitude(val) < peakAmp - 1.0) {
				val = {0.0, 0.0};
			}
		}
	}

	void DFT() {
		for (int k = 0; k < numSamples; ++k) {
			complex<double> accum = {0.0, 0.0};
			for (int n = 0; n < numSamples; ++n) {
				double theta = -2.0 * M_PI * k * n / numSamples;
				accum += signal[n] * complex<double>(cos(theta), sin(theta));
			}
			spectrum[k] = accum;
		}
	}

	void FFT() {
		if ((numSamples & (numSamples - 1)) != 0) {
			throw runtime_error("Number of samples must be a power of 2.");
		}

		vector<complex<double>> buffer = signal;
		int stages = static_cast<int>(log2(numSamples));

		// Bit-reversal permutation
		for (int i = 0; i < numSamples; ++i) {
			int revIndex = 0;
			for (int j = 0; j < stages; ++j) {
				if ((i >> j) & 1) {
					revIndex |= (1 << (stages - 1 - j));
				}
			}
			if (i < revIndex) {
				swap(buffer[i], buffer[revIndex]);
			}
		}

		// Butterfly computations
		for (int len = 2; len <= numSamples; len *= 2) {
			double theta = -2.0 * M_PI / len;
			complex<double> root(cos(theta), sin(theta));
			for (int i = 0; i < numSamples; i += len) {
				complex<double> w(1.0, 0.0);
				for (int j = 0; j < len / 2; ++j) {
					auto evenPart = buffer[i + j];
					auto oddPart = buffer[i + j + len / 2] * w;
					buffer[i + j] = evenPart + oddPart;
					buffer[i + j + len / 2] = evenPart - oddPart;
					w *= root;
				}
			}
		}

		spectrum = buffer;
	}

	void IDFT() {
		for (int k = 0; k < numSamples; ++k) {
			complex<double> accum = {0.0, 0.0};
			for (int n = 0; n < numSamples; ++n) {
				double theta = 2.0 * M_PI * n * k / numSamples;
				accum += spectrum[n] * complex<double>(cos(theta), sin(theta));
			}
			restoredSignal[k] = accum / static_cast<double>(numSamples);
		}
	}

	void IFFT() {
		if ((numSamples & (numSamples - 1)) != 0) {
			throw runtime_error("Number of samples must be a power of 2.");
		}

		vector<complex<double>> buffer = spectrum;
		int stages = static_cast<int>(log2(numSamples));

		// Bit-reversal permutation
		for (int i = 0; i < numSamples; ++i) {
			int revIndex = 0;
			for (int j = 0; j < stages; ++j) {
				if ((i >> j) & 1) {
					revIndex |= (1 << (stages - 1 - j));
				}
			}
			if (i < revIndex) {
				swap(buffer[i], buffer[revIndex]);
			}
		}

		// Butterfly with positive angle (inverse transform)
		for (int len = 2; len <= numSamples; len *= 2) {
			double theta = 2.0 * M_PI / len;
			complex<double> root(cos(theta), sin(theta));
			for (int i = 0; i < numSamples; i += len) {
				complex<double> w(1.0, 0.0);
				for (int j = 0; j < len / 2; ++j) {
					auto evenPart = buffer[i + j];
					auto oddPart = buffer[i + j + len / 2] * w;
					buffer[i + j] = evenPart + oddPart;
					buffer[i + j + len / 2] = evenPart - oddPart;
					w *= root;
				}
			}
		}

		// Normalize
		for (auto& val : buffer) {
			val /= static_cast<double>(numSamples);
		}

		restoredSignal = buffer;
	}

	void outputSpectrum(const function<bool(int)>& selector = [](int) { return true; }) const {
		cout << "Idx | Original Re | Spectrum Re | Spectrum Im | Amplitude | Phase\n";
		cout << string(70, '-') << endl;
		for (int i = 0; i < numSamples; ++i) {
			if (selector(i) && extractAmplitude(spectrum[i]) > 1e-7) {
				cout << setw(3) << i << " | "
					<< setw(12) << signal[i].real() << " | "
					<< setw(12) << spectrum[i].real() << " | "
					<< setw(12) << spectrum[i].imag() << " | "
					<< setw(10) << extractAmplitude(spectrum[i]) << " | "
					<< setw(8) << extractPhase(spectrum[i]) << endl;
			}
		}
	}

	void writeSignalsToFile(const string& inputPath, const string& outputPath) const {
		ofstream inputOut(inputPath), outputOut(outputPath);
		for (const auto& val : signal) {
			inputOut << val.real() << '\n';
		}
		for (const auto& val : restoredSignal) {
			outputOut << val.real() << '\n';
		}
	}
};