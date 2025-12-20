import os
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

BASE_DIR = r"C:\Users\Интернет\source\repos\чм7\чм7"

BASES = [
    ("haar", "Базис Хаара"),
    ("shannon", "Базис Шеннона"),
    ("d6", "Базис Добеши (D6)"),
]

def read_filter_results(basis: str, stage: int):
    """Чтение результатов фильтрации"""
    filepath = os.path.join(BASE_DIR, f"filter_results_{basis}_stage{stage}.csv")
    if os.path.exists(filepath):
        return pd.read_csv(filepath)
    
    filepath2 = os.path.join(BASE_DIR, f"filter_{basis}_stage{stage}.csv")
    if os.path.exists(filepath2):
        return pd.read_csv(filepath2)
    
    return None

def read_coeffs_before(basis: str, stage: int):
    """Чтение коэффициентов до обработки"""
    filepath = os.path.join(BASE_DIR, f"coeffs_before_{basis}_stage{stage}.csv")
    if os.path.exists(filepath):
        return pd.read_csv(filepath)
    
    filepath2 = os.path.join(BASE_DIR, f"filter_coeffs_before_{basis}_stage{stage}.csv")
    if os.path.exists(filepath2):
        return pd.read_csv(filepath2)
    
    return None

def read_pq_components(basis: str, stage: int):
    """Чтение P и Q компонент"""
    filepath = os.path.join(BASE_DIR, f"pq_components_{basis}_stage{stage}.csv")
    if os.path.exists(filepath):
        return pd.read_csv(filepath)
    
    filepath2 = os.path.join(BASE_DIR, f"filter_prevPQ_{basis}_stage{stage}.csv")
    if os.path.exists(filepath2):
        return pd.read_csv(filepath2)
    
    return None

def plot_task5_filtering():
    """График для задания 5: Обнуление ψ₂ и построение P₁"""
    fig, axs = plt.subplots(3, 4, figsize=(20, 12), constrained_layout=True)
    fig.suptitle("Задание 5: Фильтрация - обнуление ⟨z, ψ₂,k⟩ и построение P₁(z)\n" + 
                "Сравнение базисов: Хаар, Шеннон, Добеши D6", 
                fontsize=14, fontweight='bold')
    
    for row_idx, (basis, title) in enumerate(BASES):
        # Этап 2: после обнуления ψ₂ коэффициентов
        stage2_data = read_filter_results(basis, 2)
        stage2_coeffs = read_coeffs_before(basis, 2)  # ψ₂ коэффициенты ДО обнуления
        pq_data = read_pq_components(basis, 2)  # P₁ и Q₁ компоненты
        
        if stage2_data is None or stage2_coeffs is None or pq_data is None:
            print(f"Нет данных для {basis}")
            continue
        
        # Определяем колонки
        if 'index' in stage2_data.columns:
            x_col = 'index'
            original_col = 'original_real' if 'original_real' in stage2_data.columns else stage2_data.columns[1]
            filtered_col = 'filtered_real' if 'filtered_real' in stage2_data.columns else stage2_data.columns[2]
        else:
            x_col = 'i'
            original_col = 'z_re'
            filtered_col = 'zf_re'
        
        if 'psi_real' in stage2_coeffs.columns:
            coeff_x_col = 'index' if 'index' in stage2_coeffs.columns else 'idx'
            coeff_y_col = 'psi_real'
        elif 'psi_re' in stage2_coeffs.columns:
            coeff_x_col = 'idx'
            coeff_y_col = 'psi_re'
        else:
            coeff_x_col = stage2_coeffs.columns[1]
            coeff_y_col = stage2_coeffs.columns[2]
        
        if 'P_real' in pq_data.columns:
            pq_x_col = 'index' if 'index' in pq_data.columns else 'i'
            p_col = 'P_real'  # Это P₁(z_filt) - то, что нужно по заданию!
            q_col = 'Q_real'
        else:
            pq_x_col = 'i'
            p_col = 'Pprev_re'  # P₁(z_filt)
            q_col = 'Qprev_re'
        
        # 1. Исходный зашумленный сигнал
        axs[row_idx, 0].plot(stage2_data[x_col], stage2_data[original_col], 
                             linewidth=1.5, color='blue', alpha=0.7)
        axs[row_idx, 0].set_title(f"{title}: Исходный сигнал z")
        axs[row_idx, 0].set_xlabel("Отсчет")
        axs[row_idx, 0].set_ylabel("Амплитуда")
        axs[row_idx, 0].grid(True, alpha=0.3)
        
        # 2. ψ₂ коэффициенты ДО обнуления (которые нужно обнулить)
        axs[row_idx, 1].stem(stage2_coeffs[coeff_x_col], stage2_coeffs[coeff_y_col],
                             linefmt='r-', markerfmt='ro', basefmt='k-')
        axs[row_idx, 1].axhline(y=0, color='black', linestyle='-', linewidth=0.5)
        axs[row_idx, 1].set_title(f"{title}: ⟨z, ψ₂,k⟩ (обнуляются)")
        axs[row_idx, 1].set_xlabel("Индекс k")
        axs[row_idx, 1].set_ylabel("Значение")
        axs[row_idx, 1].grid(True, alpha=0.3)
        
        # 3. P₂(z) - сигнал после обнуления ψ₂ коэффициентов
        axs[row_idx, 2].plot(stage2_data[x_col], stage2_data[filtered_col],
                             linewidth=2, color='green')
        axs[row_idx, 2].set_title(f"{title}: P₂(z) (после обнуления ψ₂)")
        axs[row_idx, 2].set_xlabel("Отсчет")
        axs[row_idx, 2].set_ylabel("Амплитуда")
        axs[row_idx, 2].grid(True, alpha=0.3)
        
        # 4. P₁(z) - то, что нужно построить по заданию!
        axs[row_idx, 3].plot(pq_data[pq_x_col], pq_data[p_col],
                             linewidth=2, color='orange')
        axs[row_idx, 3].set_title(f"{title}: P₁(z) (финальный результат)")
        axs[row_idx, 3].set_xlabel("Отсчет")
        axs[row_idx, 3].set_ylabel("Амплитуда")
        axs[row_idx, 3].grid(True, alpha=0.3)
    
    # Добавляем сравнение P₁(z) для всех базисов
    fig2, ax2 = plt.subplots(figsize=(12, 6), constrained_layout=True)
    fig2.suptitle("Задание 5: Сравнение P₁(z) для разных базисов после обнуления ψ₂", 
                  fontsize=14, fontweight='bold')
    
    colors = ['blue', 'green', 'red']
    for idx, (basis, title) in enumerate(BASES):
        pq_data = read_pq_components(basis, 2)
        if pq_data is not None:
            if 'P_real' in pq_data.columns:
                pq_x_col = 'index' if 'index' in pq_data.columns else 'i'
                p_col = 'P_real'
            else:
                pq_x_col = 'i'
                p_col = 'Pprev_re'
            
            ax2.plot(pq_data[pq_x_col], pq_data[p_col], 
                     linewidth=2, color=colors[idx], label=title, alpha=0.8)
    
    ax2.set_title("Наложение P₁(z) для всех базисов")
    ax2.set_xlabel("Отсчет")
    ax2.set_ylabel("Амплитуда P₁(z)")
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    # Сохраняем оба графика
    plt.savefig(os.path.join(BASE_DIR, "task5_comparison_P1_all_bases.png"), dpi=150)
    plt.close(fig2)
    
    plt.savefig(os.path.join(BASE_DIR, "task5_filtering_analysis.png"), dpi=150)
    plt.close(fig)
    
    print("Сохранены графики для задания 5:")
    print("1. task5_filtering_analysis.png - подробный анализ для каждого базиса")
    print("2. task5_comparison_P1_all_bases.png - сравнение P₁(z) для всех базисов")

def analyze_filtering_accuracy():
    """Анализ точности фильтрации для разных базисов"""
    print("\n" + "=" * 60)
    print("АНАЛИЗ ТОЧНОСТИ ФИЛЬТРАЦИИ КУСОЧНО-ПОСТОЯННОГО СИГНАЛА")
    print("=" * 60)
    
    results = {}
    
    for basis, title in BASES:
        # Читаем исходный сигнал и P₁(z)
        stage2_data = read_filter_results(basis, 2)
        pq_data = read_pq_components(basis, 2)
        
        if stage2_data is None or pq_data is None:
            continue
        
        # Определяем колонки
        if 'original_real' in stage2_data.columns:
            original = stage2_data['original_real'].values
        else:
            original = stage2_data['z_re'].values
        
        if 'P_real' in pq_data.columns:
            p1 = pq_data['P_real'].values
        else:
            p1 = pq_data['Pprev_re'].values
        
        # Вычисляем метрики
        mse = np.mean((original - p1) ** 2)
        rmse = np.sqrt(mse)
        mae = np.mean(np.abs(original - p1))
        
        # Находим максимальное отклонение на границах разрывов
        boundaries = [128, 256, 384]  # Границы участков
        max_boundary_error = 0
        for boundary in boundaries:
            idx = min(boundary, len(original)-1)
            error = abs(original[idx] - p1[idx])
            max_boundary_error = max(max_boundary_error, error)
        
        results[title] = {
            'MSE': mse,
            'RMSE': rmse,
            'MAE': mae,
            'MaxBoundaryError': max_boundary_error
        }
        
        print(f"\n{title}:")
        print(f"  MSE (среднеквадратичная ошибка): {mse:.6f}")
        print(f"  RMSE (корень из MSE): {rmse:.6f}")
        print(f"  MAE (средняя абсолютная ошибка): {mae:.6f}")
        print(f"  Макс. ошибка на границах: {max_boundary_error:.6f}")
    
    # Определяем лучший базис
    if results:
        best_by_rmse = min(results.items(), key=lambda x: x[1]['RMSE'])
        best_by_boundary = min(results.items(), key=lambda x: x[1]['MaxBoundaryError'])
        
        print("\n" + "=" * 60)
        print("ВЫВОД: В каком базисе фильтрация точнее?")
        print("=" * 60)
        print(f"По общей точности (RMSE): {best_by_rmse[0]} (RMSE={best_by_rmse[1]['RMSE']:.6f})")
        print(f"По сохранению границ: {best_by_boundary[0]} (макс. ошибка={best_by_boundary[1]['MaxBoundaryError']:.6f})")
        
        if best_by_rmse[0] == best_by_boundary[0]:
            print(f"\nОднозначно лучший базис: {best_by_rmse[0]}")
        else:
            print(f"\nДля кусочно-постоянного сигнала важнее сохранение границ,")
            print(f"поэтому рекомендуемый базис: {best_by_boundary[0]}")

def main():
    print("=" * 60)
    print("ЗАДАНИЕ 5: Фильтрация зашумленного сигнала")
    print("Обнуление ⟨z, ψ₂,k⟩ и построение P₁(z)")
    print("=" * 60)
    
    # 1. Строим графики
    plot_task5_filtering()
    
    # 2. Анализируем точность
    analyze_filtering_accuracy()
    
    print("\n" + "=" * 60)
    print("Готово! Результаты сохранены в файлы:")
    print("- task5_filtering_analysis.png")
    print("- task5_comparison_P1_all_bases.png")
    print("=" * 60)

if __name__ == "__main__":
    main()
