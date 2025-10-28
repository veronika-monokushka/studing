#include <iostream>
#include <vector>
#include <random>
#include <fstream>
#include <cmath>
#include <iomanip>
#include <string>
#include <locale>
#include <codecvt>
#include "Smoothing_Spline_1D.h"

using namespace Com_Methods;

// Простая настройка для русского языка
void setup_russian() {
    #ifdef _WIN32
        system("chcp 65001 > nul"); // Устанавливаем UTF-8 в консоли Windows
    #endif
}

// Функция для генерации случайных чисел по нормальному распределению
std::vector<double> generate_normal_distribution(int n, double mean, double stddev) {
    std::random_device rd;
    std::mt19937 gen(rd());
    std::normal_distribution<> d(mean, stddev);
    
    std::vector<double> data;
    data.reserve(n);
    for (int i = 0; i < n; ++i) {
        data.push_back(d(gen));
    }
    return data;
}

// Функция для вычисления сглаживающего сплайна
std::vector<double> calculate_smoothing_spline(const std::vector<Point>& points, 
                                              const std::vector<double>& values,
                                              double p, double W) {
    Smoothing_Spline_1D spline(p, W);
    spline.Update_Spline(points, values);
    
    std::vector<double> smoothed_values;
    for (const auto& point : points) {
        double result[3];
        spline.Get_Value(point, result);
        smoothed_values.push_back(result[0]);
    }
    
    return smoothed_values;
}

// Функция для вывода таблицы в Markdown формате с русским текстом
void print_markdown_table(const std::vector<double>& random_data,
                         const std::vector<std::vector<double>>& all_smoothed_values,
                         const std::vector<double>& p_values,
                         int num_observations,
                         double mean,
                         double stddev,
                         double W,
                         const std::string& filename_suffix) {
    
    // Создаем файл для таблицы с суффиксом
    std::string table_filename = "spline_table" + filename_suffix + ".md";
    std::ofstream table_file(table_filename);
    
    // Заголовок таблицы с параметрами (русский текст)
    table_file << "# Результаты расчётов сглаживающих сплайнов\n\n";
    table_file << "| Число наблюдений N | Мат. ожидание M | Отклонение σ | Вес W |\n";
    table_file << "|---|---|---|---|\n";
    table_file << "| " << num_observations << " | " << std::fixed << std::setprecision(2) << mean 
               << " | " << std::setprecision(2) << stddev << " | " << W << " |\n\n";
    
    table_file << "---\n\n";
    table_file << "### Случайная величина и значения сплайнов\n\n";
    
    // Заголовок основной таблицы
    table_file << "| № | Случайная величина | Вес w |";
    for (double p : p_values) {
        table_file << " p = " << p << " |";
    }
    table_file << "\n";
    
    // Разделитель заголовка
    table_file << "|---|---|---|";
    for (size_t i = 0; i < p_values.size(); i++) {
        table_file << "---|";
    }
    table_file << "\n";
    
    // Выводим первые 10 наблюдений для примера
    int display_count = std::min(10, num_observations);
    for (int i = 0; i < display_count; ++i) {
        table_file << "| " << (i + 1) << " | ";
        table_file << std::scientific << std::setprecision(8) << random_data[i] << " | ";
        table_file << W << " |";
        
        for (size_t p_idx = 0; p_idx < p_values.size(); p_idx++) {
            table_file << " " << std::scientific << std::setprecision(5) 
                      << all_smoothed_values[p_idx][i] << " |";
        }
        table_file << "\n";
    }
    
    table_file.close();
    
    // Также выводим таблицу в консоль с русским текстом
    std::cout << "\n" << std::string(80, '=') << "\n";
    std::cout << "ТАБЛИЦА РЕЗУЛЬТАТОВ ДЛЯ W = " << W << " (первые " << display_count << " наблюдений из " << num_observations << ")\n";
    std::cout << std::string(80, '=') << "\n";
    
    std::cout << "Параметры: N=" << num_observations << ", M=" << std::fixed << std::setprecision(2) 
              << mean << ", σ=" << std::setprecision(2) << stddev << ", W=" << W << "\n\n";
    
    // Заголовок для консоли
    std::cout << std::setw(4) << "№" << " "
              << std::setw(16) << "Случайная" << " "
              << std::setw(6) << "Вес" << " ";
    for (double p : p_values) {
        std::cout << std::setw(12) << "p=" + std::to_string(p).substr(0,4) << " ";
    }
    std::cout << "\n";
    
    std::cout << std::setw(4) << "" << " "
              << std::setw(16) << "величина" << " "
              << std::setw(6) << "w" << " ";
    for (size_t i = 0; i < p_values.size(); i++) {
        std::cout << std::setw(12) << "" << " ";
    }
    std::cout << "\n" << std::string(80, '-') << "\n";
    
    // Данные для консоли
    for (int i = 0; i < display_count; ++i) {
        std::cout << std::setw(3) << (i + 1) << " "
                  << std::scientific << std::setprecision(8) << std::setw(16) << random_data[i] << " "
                  << std::setw(6) << W << " ";
        
        for (size_t p_idx = 0; p_idx < p_values.size(); p_idx++) {
            std::cout << std::scientific << std::setprecision(4) << std::setw(12) 
                     << all_smoothed_values[p_idx][i] << " ";
        }
        std::cout << "\n";
    }
    
    std::cout << std::string(80, '=') << "\n";
    std::cout << "Полная таблица сохранена в файле: " << table_filename << "\n";
}

// Функция для выполнения вычислений для конкретного значения W
void process_for_W(double W, const std::vector<Point>& points, 
                  const std::vector<double>& random_data,
                  const std::vector<double>& p_values,
                  int num_observations, double mean, double stddev) {
    
    std::string suffix = (W == 1.0) ? "_W1" : "_W05";
    
    // Создание CSV файла с суффиксом
    std::string csv_filename = "spline_results" + suffix + ".csv";
    std::ofstream csv_file(csv_filename);
    
    // Заголовок CSV файла
    csv_file << "observation_number,original_value";
    for (double p : p_values) {
        csv_file << ",p_" << p;
    }
    csv_file << "\n";

    // Вычисление сплайнов для разных p с заданным W
    std::vector<std::vector<double>> all_smoothed_values;

    std::cout << "\nВычисление сплайнов для W = " << W << "...\n";
    for (double p : p_values) {
        std::cout << "Обработка p = " << p << " (W = " << W << ")" << std::endl;
        auto smoothed = calculate_smoothing_spline(points, random_data, p, W);
        all_smoothed_values.push_back(smoothed);
    }
    std::cout << "Все сплайны для W = " << W << " вычислены успешно!\n";
    
    // Запись данных в CSV
    for (int i = 0; i < num_observations; ++i) {
        csv_file << i << "," << random_data[i];
        
        for (const auto& smoothed_values : all_smoothed_values) {
            csv_file << "," << smoothed_values[i];
        }
        
        csv_file << "\n";
    }
    
    csv_file.close();
    
    // Создание красивой таблицы
    print_markdown_table(random_data, all_smoothed_values, p_values, num_observations, mean, stddev, W, suffix);
    
    std::cout << "\nРезультаты для W = " << W << ":\n";
    std::cout << "- Создан файл: " << csv_filename << " (все данные)\n";
    std::cout << "- Создан файл: spline_table" << suffix << ".md (форматированная таблица)\n";
}

int main() {
    // Настраиваем русский язык
    setup_russian();
    
    try {
        // 1. Генерация случайных чисел
        int num_observations = 1731;
        double mean = 0.94;
        double stddev = 4.95;
        
        std::cout << "Генерация случайных чисел...\n";
        auto random_data = generate_normal_distribution(num_observations, mean, stddev);
        
        // 2. Создание точек (номер наблюдения как координата x)
        std::vector<Point> points;
        for (int i = 0; i < num_observations; ++i) {
            points.emplace_back(i, 0, 0);
        }
        
        // 3. Параметры сглаживания для тестирования
        std::vector<double> p_values = {0.0, 0.1, 0.5, 0.7, 0.99};
        
        // 4. Выполняем вычисления для W = 1.0
        process_for_W(1.0, points, random_data, p_values, num_observations, mean, stddev);
        
        // 5. Выполняем вычисления для W = 0.5
        process_for_W(0.5, points, random_data, p_values, num_observations, mean, stddev);
        
        std::cout << "\n" << std::string(80, '=') << "\n";
        std::cout << "ВСЕ ВЫЧИСЛЕНИЯ ЗАВЕРШЕНЫ!\n";
        std::cout << std::string(80, '=') << "\n";
        
        std::cout << "\nИтоговые результаты:\n";
        std::cout << "- Обработано наблюдений: " << num_observations << "\n";
        std::cout << "- Параметры сглаживания: ";
        for (double p : p_values) {
            std::cout << p << " ";
        }
        std::cout << "\n";
        std::cout << "- Созданные файлы для W = 1.0:\n";
        std::cout << "  * spline_results_W1.csv\n";
        std::cout << "  * spline_table_W1.md\n";
        std::cout << "- Созданные файлы для W = 0.5:\n";
        std::cout << "  * spline_results_W05.csv\n";
        std::cout << "  * spline_table_W05.md\n";
        
    } catch (const std::exception& e) {
        std::cerr << "Ошибка: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}