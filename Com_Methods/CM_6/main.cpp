#include <iostream>
#include <vector>
#include <complex>
#include <cmath>
#include <iomanip>
#include <chrono>
#include <string>
#include <fstream>
#include "f_transform.cpp"

using namespace std;

// Простая настройка для русского языка
void setup_russian() {
#ifdef _WIN32
    system("chcp 65001 > nul"); // Устанавливаем UTF-8 в консоли Windows
#endif
}

int main() {
    setup_russian();

    const int n = 9;
    const int N = 512;  // N = 512

    const double A = 2.29;
    const double B = 0.22;
    const double omega1 = 1.0;
    const double omega2 = 192.0;
    const double phi = M_PI / 4.0;

    // === 1. СОХРАНЯЕМ ИСХОДНЫЙ СИГНАЛ В ОТДЕЛЬНУЮ ПЕРЕМЕННУЮ ===
    vector<complex<double>> originalSignal(N);
    for (int j = 0; j < N; ++j) {
        double term1 = A * cos(2.0 * M_PI * omega1 * j / N + phi);
        double term2 = B * cos(2.0 * M_PI * omega2 * j / N);
        originalSignal[j] = complex<double>(term1 + term2, 0.0);
    }

    // === 2. DFT И FFT (на базе originalSignal) ===
    SignalProcessor processor(N);
    processor.signal = originalSignal; // ← используем сохранённый сигнал

    auto start_dft = chrono::high_resolution_clock::now();
    processor.DFT();
    auto end_dft = chrono::high_resolution_clock::now();
    auto duration_dft = chrono::duration<double>(end_dft - start_dft);

    auto start_fft = chrono::high_resolution_clock::now();
    processor.FFT();
    auto end_fft = chrono::high_resolution_clock::now();
    auto duration_fft = chrono::duration<double>(end_fft - start_fft);

    cout << std::fixed << std::setprecision(6);
    cout << "=== DFT завершён за " << duration_dft.count() << " с ===" << endl;
    cout << "=== FFT завершён за " << duration_fft.count() << " с ===" << endl;

    cout << std::fixed << std::setprecision(4);
    cout << "\n=== Таблица спектра (ненулевые частоты) ===" << endl;
    cout << "m   | Re z(j) | Re Z(m) | Im Z(m) | Амплитуда | Фаза\n";
    cout << string(70, '-') << endl;
    for (int m = 0; m < N; ++m) {
        double amp = processor.extractAmplitude(processor.spectrum[m]);
        if (amp > 1e-3) {
            double phase = processor.extractPhase(processor.spectrum[m]);
            cout << setw(3) << m << " | "
                 << setw(8) << processor.signal[m].real() << " | "
                 << setw(8) << processor.spectrum[m].real() << " | "
                 << setw(8) << processor.spectrum[m].imag() << " | "
                 << setw(9) << amp << " | "
                 << setw(8) << phase << endl;
        }
    }

    // === 3. ОБНУЛЕНИЕ ШУМОВЫХ КОМПОНЕНТ И IDFT ===
    {
        SignalProcessor proc_dft(N);
        proc_dft.signal = originalSignal; // ← теперь originalSignal определена!
        proc_dft.DFT(); // Получаем спектр DFT

        cout << "\n=== Обнуление шумовых компонент: m = 192 и m = 320 ===" << endl;
        proc_dft.spectrum[192] = {0.0, 0.0};
        proc_dft.spectrum[320] = {0.0, 0.0};

        // Вычисляем IDFT вручную (можно заменить на proc_dft.IDFT() после присвоения spectrum в restoredSignal, но проще так)
        vector<complex<double>> filteredSignal(N);
        for (int k = 0; k < N; ++k) {
            complex<double> sum{0.0, 0.0};
            for (int n = 0; n < N; ++n) {
                double angle = 2.0 * M_PI * n * k / N;
                sum += proc_dft.spectrum[n] * complex<double>(cos(angle), sin(angle));
            }
            filteredSignal[k] = sum / static_cast<double>(N);
        }

        // Сохранение в файлы
        ofstream origOut("original.txt");
        ofstream filtOut("filtered.txt");
        for (int i = 0; i < N; ++i) {
            origOut << i << " " << originalSignal[i].real() << '\n';
            filtOut << i << " " << filteredSignal[i].real() << '\n';
        }

        cout << "Исходный и отфильтрованный сигналы сохранены в:\n"
             << "  original.txt\n"
             << "  filtered.txt\n";
    }

    // === 4. ВОССТАНОВЛЕНИЕ ЧЕРЕЗ IFFT (опционально) ===
    cout << "\n=== Восстановление сигнала через IFFT ===" << endl;
    processor.IFFT();

    processor.writeSignalsToFile("input_signal.txt", "restored_signal.txt");
    cout << "Сигналы сохранены в input_signal.txt и restored_signal.txt" << endl;


        // === 5. ЗАДАНИЕ №6: НОВЫЙ СИГНАЛ Z(j) ПО УСЛОВИЮ ===
    cout << "\n" << string(80, '=') << endl;

    const double omega2_new = 192.0; // как и ранее
    vector<complex<double>> signal6(N);
    int N4 = N / 4;   // 128
    int N2 = N / 2;   // 256
    int N34 = 3 * N / 4; // 384

    for (int j = 0; j < N; ++j) {
        if ((j >= 0 && j < N4) || (j > N2 && j <= N34)) {
            signal6[j] = {0.0, 0.0}; // z(j) = 0
        } else {
            double term = A + B * cos(2.0 * M_PI * omega2_new * j / N);
            signal6[j] = {term, 0.0};
        }
    }

    // Вычисляем DFT для нового сигнала
    SignalProcessor proc6(N);
    proc6.signal = signal6;
    auto start_dft6 = chrono::high_resolution_clock::now();
    proc6.DFT();
    auto end_dft6 = chrono::high_resolution_clock::now();
    auto duration_dft6 = chrono::duration<double>(end_dft6 - start_dft6);

    cout << std::fixed << std::setprecision(6);
    cout << "=== DFT для сигнала №2 завершён за " << duration_dft6.count() << " с ===" << endl;

    // Вывод таблицы ненулевых частот
    cout << std::fixed << std::setprecision(4);
    cout << "\n=== Таблица спектра для сигнала №2 (ненулевые частоты) ===" << endl;
    cout << "m   | Re z(j) | Re Z(m) | Im Z(m) | Амплитуда | Фаза\n";
    cout << string(70, '-') << endl;

    for (int m = 0; m < N; ++m) {
        double amp = proc6.extractAmplitude(proc6.spectrum[m]);
        if (amp > 1e-3) {
            double phase = proc6.extractPhase(proc6.spectrum[m]);
            cout << setw(3) << m << " | "
                 << setw(8) << signal6[m].real() << " | "
                 << setw(8) << proc6.spectrum[m].real() << " | "
                 << setw(8) << proc6.spectrum[m].imag() << " | "
                 << setw(9) << amp << " | "
                 << setw(8) << phase << endl;
        }
    }

    ofstream sig6Out("signal6.txt");
    for (int i = 0; i < N; ++i) {
        sig6Out << i << " " << signal6[i].real() << '\n';
    }
    return 0;
}