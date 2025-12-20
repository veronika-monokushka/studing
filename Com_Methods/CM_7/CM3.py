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

# Ваши данные
N = 512  # 2^9 = 512
A = 2.35
B = 0.10
w1 = 2
w2 = 190

def read_coeffs_file(basis: str, stage: int, file_type: str):
    """Чтение файлов с коэффициентами"""
    # Пробуем разные варианты имен файлов
    possible_names = [
        f"coeffs_{file_type}_{basis}_stage{stage}.csv",
        f"filter_coeffs_{file_type}_{basis}_stage{stage}.csv",
        f"filter_{file_type}_{basis}_stage{stage}.csv"
    ]
    
    for filename in possible_names:
        filepath = os.path.join(BASE_DIR, filename)
        if os.path.exists(filepath):
            return pd.read_csv(filepath)
    return None

def read_filter_results(basis: str, stage: int):
    """Чтение результатов фильтрации"""
    possible_names = [
        f"filter_results_{basis}_stage{stage}.csv",
        f"filter_{basis}_stage{stage}.csv"
    ]
    
    for filename in possible_names:
        filepath = os.path.join(BASE_DIR, filename)
        if os.path.exists(filepath):
            return pd.read_csv(filepath)
    return None

def read_partial_reconstruction(basis: str, stage: int):
    """Чтение частичного восстановления"""
    possible_names = [
        f"pq_components_{basis}_stage{stage}.csv",
        f"filter_prevPQ_{basis}_stage{stage}.csv"
    ]
    
    for filename in possible_names:
        filepath = os.path.join(BASE_DIR, filename)
        if os.path.exists(filepath):
            return pd.read_csv(filepath)
    return None

def plot_scalar_products_for_basis(basis: str, title: str):
    """График 1: Скалярные произведения для этапов 1-4 - ИСПРАВЛЕННЫЙ"""
    fig, axs = plt.subplots(4, 2, figsize=(16, 12), constrained_layout=True)
    fig.suptitle(f"Задание 3: Скалярные произведения - {title}\nN={N}, A={A}, B={B}, w1={w1}, w2={w2}", fontsize=14)
    
    for stage_idx, stage in enumerate([1, 2, 3, 4]):
        # Читаем коэффициенты
        coeffs_before = read_coeffs_file(basis, stage, "before")
        coeffs_after = read_coeffs_file(basis, stage, "after")
        
        if coeffs_before is None or coeffs_after is None:
            print(f"Нет данных коэффициентов для {basis}, этап {stage}")
            continue
        
        # Определяем колонки для действительной и мнимой частей
        # Пробуем сначала новые имена
        if 'psi_real' in coeffs_before.columns and 'psi_imag' in coeffs_before.columns:
            psi_real_col = 'psi_real'
            psi_imag_col = 'psi_imag'
            phi_real_col = 'phi_real'
            phi_imag_col = 'phi_imag'
            idx_col = 'index'
        elif 'psi_re' in coeffs_before.columns and 'psi_im' in coeffs_before.columns:
            psi_real_col = 'psi_re'
            psi_imag_col = 'psi_im'
            phi_real_col = 'phi_re'
            phi_imag_col = 'phi_im'
            idx_col = 'idx'
        else:
            # Ищем подходящие колонки по порядку
            if len(coeffs_before.columns) >= 8:
                # Новый формат: k,index,psi_real,psi_imag,phi_real,phi_imag,psi_magnitude,phi_magnitude
                idx_col = 'index' if 'index' in coeffs_before.columns else coeffs_before.columns[1]
                psi_real_col = coeffs_before.columns[2]
                psi_imag_col = coeffs_before.columns[3]
                phi_real_col = coeffs_before.columns[4]
                phi_imag_col = coeffs_before.columns[5]
            elif len(coeffs_before.columns) >= 6:
                # Старый формат: k,idx,psi_re,psi_im,phi_re,phi_im,psi_abs,phi_abs
                idx_col = 'idx' if 'idx' in coeffs_before.columns else coeffs_before.columns[1]
                psi_real_col = coeffs_before.columns[2]
                psi_imag_col = coeffs_before.columns[3]
                phi_real_col = coeffs_before.columns[4]
                phi_imag_col = coeffs_before.columns[5]
            else:
                print(f"Неизвестный формат файла для {basis}, этап {stage}")
                continue
        
        # График 1: ДЕЙСТВИТЕЛЬНАЯ ЧАСТЬ ψ коэффициентов
        axs[stage_idx, 0].stem(coeffs_before[idx_col], coeffs_before[psi_real_col], 
                               linefmt='b-', markerfmt='bo', basefmt='k-')
        axs[stage_idx, 0].axhline(y=0, color='black', linestyle='-', linewidth=0.5)
        axs[stage_idx, 0].set_title(f"Re⟨z, ψ_{-stage},k⟩ (этап {stage})")
        axs[stage_idx, 0].set_xlabel("Индекс k")
        axs[stage_idx, 0].set_ylabel("Действительная часть")
        axs[stage_idx, 0].grid(True, alpha=0.3)
        
        # График 2: ДЕЙСТВИТЕЛЬНАЯ ЧАСТЬ φ коэффициентов
        axs[stage_idx, 1].stem(coeffs_after[idx_col], coeffs_after[phi_real_col], 
                               linefmt='g-', markerfmt='gs', basefmt='k-')
        axs[stage_idx, 1].axhline(y=0, color='black', linestyle='-', linewidth=0.5)
        axs[stage_idx, 1].set_title(f"Re⟨z, φ_{-stage},k⟩ (этап {stage})")
        axs[stage_idx, 1].set_xlabel("Индекс k")
        axs[stage_idx, 1].set_ylabel("Действительная часть")
        axs[stage_idx, 1].grid(True, alpha=0.3)
    
    filename = f"task3_scalar_products_real_{basis}.png"
    plt.savefig(os.path.join(BASE_DIR, filename), dpi=150)
    plt.close(fig)
    print(f"Сохранен график скалярных произведений (действ. часть): {filename}")

def plot_scalar_products_imaginary_for_basis(basis: str, title: str):
    """График 1b: Мнимая часть скалярных произведений"""
    fig, axs = plt.subplots(4, 2, figsize=(16, 12), constrained_layout=True)
    fig.suptitle(f"Задание 3: Скалярные произведения (мнимая часть) - {title}\nN={N}, A={A}, B={B}, w1={w1}, w2={w2}", fontsize=14)
    
    for stage_idx, stage in enumerate([1, 2, 3, 4]):
        # Читаем коэффициенты
        coeffs_before = read_coeffs_file(basis, stage, "before")
        coeffs_after = read_coeffs_file(basis, stage, "after")
        
        if coeffs_before is None or coeffs_after is None:
            continue
        
        # Определяем колонки для действительной и мнимой частей
        if 'psi_real' in coeffs_before.columns and 'psi_imag' in coeffs_before.columns:
            psi_real_col = 'psi_real'
            psi_imag_col = 'psi_imag'
            phi_real_col = 'phi_real'
            phi_imag_col = 'phi_imag'
            idx_col = 'index'
        elif 'psi_re' in coeffs_before.columns and 'psi_im' in coeffs_before.columns:
            psi_real_col = 'psi_re'
            psi_imag_col = 'psi_im'
            phi_real_col = 'phi_re'
            phi_imag_col = 'phi_im'
            idx_col = 'idx'
        else:
            if len(coeffs_before.columns) >= 8:
                idx_col = 'index' if 'index' in coeffs_before.columns else coeffs_before.columns[1]
                psi_real_col = coeffs_before.columns[2]
                psi_imag_col = coeffs_before.columns[3]
                phi_real_col = coeffs_before.columns[4]
                phi_imag_col = coeffs_before.columns[5]
            elif len(coeffs_before.columns) >= 6:
                idx_col = 'idx' if 'idx' in coeffs_before.columns else coeffs_before.columns[1]
                psi_real_col = coeffs_before.columns[2]
                psi_imag_col = coeffs_before.columns[3]
                phi_real_col = coeffs_before.columns[4]
                phi_imag_col = coeffs_before.columns[5]
            else:
                continue
        
        # График 1: МНИМАЯ ЧАСТЬ ψ коэффициентов
        axs[stage_idx, 0].stem(coeffs_before[idx_col], coeffs_before[psi_imag_col], 
                               linefmt='b-', markerfmt='bo', basefmt='k-')
        axs[stage_idx, 0].axhline(y=0, color='black', linestyle='-', linewidth=0.5)
        axs[stage_idx, 0].set_title(f"Im⟨z, ψ_{-stage},k⟩ (этап {stage})")
        axs[stage_idx, 0].set_xlabel("Индекс k")
        axs[stage_idx, 0].set_ylabel("Мнимая часть")
        axs[stage_idx, 0].grid(True, alpha=0.3)
        
        # График 2: МНИМАЯ ЧАСТЬ φ коэффициентов
        axs[stage_idx, 1].stem(coeffs_after[idx_col], coeffs_after[phi_imag_col], 
                               linefmt='g-', markerfmt='gs', basefmt='k-')
        axs[stage_idx, 1].axhline(y=0, color='black', linestyle='-', linewidth=0.5)
        axs[stage_idx, 1].set_title(f"Im⟨z, φ_{-stage},k⟩ (этап {stage})")
        axs[stage_idx, 1].set_xlabel("Индекс k")
        axs[stage_idx, 1].set_ylabel("Мнимая часть")
        axs[stage_idx, 1].grid(True, alpha=0.3)
    
    filename = f"task3_scalar_products_imag_{basis}.png"
    plt.savefig(os.path.join(BASE_DIR, filename), dpi=150)
    plt.close(fig)
    print(f"Сохранен график скалярных произведений (мнимая часть): {filename}")

def plot_partial_reconstruction_for_basis(basis: str, title: str):
    """График 2: Частичное восстановление сигнала на каждом этапе"""
    fig, axs = plt.subplots(4, 2, figsize=(16, 12), constrained_layout=True)
    fig.suptitle(f"Задание 3: Частичное восстановление - {title}\nN={N}, A={A}, B={B}, w1={w1}, w2={w2}", fontsize=14)
    
    for stage_idx, stage in enumerate([1, 2, 3, 4]):
        # Читаем данные
        filter_data = read_filter_results(basis, stage)
        pq_data = read_partial_reconstruction(basis, stage)
        
        if filter_data is None or pq_data is None:
            print(f"Нет данных восстановления для {basis}, этап {stage}")
            continue
        
        # Определяем колонки
        if 'index' in filter_data.columns:
            x_col = 'index'
            original_col = 'original_real' if 'original_real' in filter_data.columns else filter_data.columns[1]
            filtered_col = 'filtered_real' if 'filtered_real' in filter_data.columns else filter_data.columns[2]
        else:
            x_col = 'i'
            original_col = 'z_re'
            filtered_col = 'zf_re'
        
        if 'index' in pq_data.columns:
            pq_x_col = 'index'
            p_col = 'P_real' if 'P_real' in pq_data.columns else pq_data.columns[1]
            q_col = 'Q_real' if 'Q_real' in pq_data.columns else pq_data.columns[2]
        else:
            pq_x_col = 'i'
            p_col = 'Pprev_re'
            q_col = 'Qprev_re'
        
        # График 1: Исходный vs Отфильтрованный
        axs[stage_idx, 0].plot(filter_data[x_col], filter_data[original_col], 
                               label='Исходный z', linewidth=1.5, alpha=0.7, color='blue')
        axs[stage_idx, 0].plot(filter_data[x_col], filter_data[filtered_col], 
                               label=f'P_-{stage}(z)', linewidth=2, color='green')
        axs[stage_idx, 0].fill_between(filter_data[x_col], filter_data[original_col], filter_data[filtered_col], 
                                       alpha=0.2, color='gray', label='Разность')
        axs[stage_idx, 0].set_title(f"Этап {stage}: Исходный vs P_-{stage}(z)")
        axs[stage_idx, 0].set_xlabel("Отсчет")
        axs[stage_idx, 0].set_ylabel("Амплитуда")
        axs[stage_idx, 0].legend(loc='best', fontsize=8)
        axs[stage_idx, 0].grid(True, alpha=0.3)
        
        # График 2: P и Q компоненты предыдущего этапа
        axs[stage_idx, 1].plot(pq_data[pq_x_col], pq_data[p_col], 
                               label=f'P_-{max(stage-1,1)}', linewidth=2, color='orange')
        axs[stage_idx, 1].plot(pq_data[pq_x_col], pq_data[q_col], 
                               label=f'Q_-{max(stage-1,1)}', linewidth=2, color='red', linestyle='--')
        axs[stage_idx, 1].set_title(f"Этап {stage}: P и Q компоненты предыдущего уровня")
        axs[stage_idx, 1].set_xlabel("Отсчет")
        axs[stage_idx, 1].set_ylabel("Амплитуда")
        axs[stage_idx, 1].legend(loc='best', fontsize=8)
        axs[stage_idx, 1].grid(True, alpha=0.3)
    
    filename = f"task3_partial_reconstruction_{basis}.png"
    plt.savefig(os.path.join(BASE_DIR, filename), dpi=150)
    plt.close(fig)
    print(f"Сохранен график частичного восстановления: {filename}")

def plot_noise_behavior_comparison():
    """График 3: Поведение зашумления при переходе от этапа к этапу"""
    fig, axs = plt.subplots(3, 4, figsize=(20, 12), constrained_layout=True)
    fig.suptitle(f"Задание 3: Поведение зашумления при переходе от этапа к этапу\nN={N}, A={A}, B={B}, w1={w1}, w2={w2}", 
                 fontsize=14, fontweight='bold')
    
    for row_idx, (basis, title) in enumerate(BASES):
        noise_levels = []
        stages = []
        
        for stage in [1, 2, 3, 4]:
            filter_data = read_filter_results(basis, stage)
            
            if filter_data is None:
                continue
            
            # Определяем колонки
            if 'original_real' in filter_data.columns and 'filtered_real' in filter_data.columns:
                original = filter_data['original_real'].values
                filtered = filter_data['filtered_real'].values
            elif 'z_re' in filter_data.columns and 'zf_re' in filter_data.columns:
                original = filter_data['z_re'].values
                filtered = filter_data['zf_re'].values
            else:
                continue
            
            # Вычисляем уровень шума (среднеквадратичная ошибка)
            noise_level = np.sqrt(np.mean((original - filtered) ** 2))
            noise_levels.append(noise_level)
            stages.append(stage)
            
            # График разности (шум) для каждого этапа
            ax = axs[row_idx, stage-1]
            diff = original - filtered
            ax.plot(range(len(diff)), diff, linewidth=1, alpha=0.7, color='red')
            ax.axhline(y=0, color='black', linestyle='-', linewidth=0.5)
            ax.fill_between(range(len(diff)), 0, diff, alpha=0.3, color='red')
            
            ax.set_title(f"{title} - Этап {stage}\nСКО = {noise_level:.6f}")
            ax.set_xlabel("Отсчет")
            ax.set_ylabel("Разность (шум)")
            ax.grid(True, alpha=0.3)
        
        # Добавляем график изменения уровня шума по этапам
        if len(noise_levels) > 0:
            ax_extra = axs[row_idx, 3] if row_idx == 0 else None
            if ax_extra:
                ax_extra.clear()
                ax_extra.plot(stages, noise_levels, marker='o', linewidth=2, markersize=8)
                ax_extra.set_title(f"{title}: Зависимость СКО от этапа")
                ax_extra.set_xlabel("Номер этапа")
                ax_extra.set_ylabel("СКО шума")
                ax_extra.grid(True, alpha=0.3)
                ax_extra.set_xticks([1, 2, 3, 4])
    
    filename = "task3_noise_behavior_comparison.png"
    plt.savefig(os.path.join(BASE_DIR, filename), dpi=150)
    plt.close(fig)
    print(f"Сохранен график поведения шума: {filename}")

def plot_all_bases_comparison():
    """Сводный график сравнения всех базисов"""
    fig, axs = plt.subplots(3, 4, figsize=(20, 12), constrained_layout=True)
    fig.suptitle(f"Сравнение вейвлет-базисов: Хаар, Шеннон, Добеши D6\nN={N}, A={A}, B={B}, w1={w1}, w2={w2}", 
                 fontsize=16, fontweight='bold')
    
    for col_idx, stage in enumerate([1, 2, 3, 4]):
        for row_idx, (basis, title) in enumerate(BASES):
            filter_data = read_filter_results(basis, stage)
            coeffs_data = read_coeffs_file(basis, stage, "before")
            
            if filter_data is None or coeffs_data is None:
                continue
            
            ax = axs[row_idx, col_idx]
            
            # Определяем колонки для сигнала
            if 'index' in filter_data.columns:
                x_col = 'index'
                original_col = 'original_real' if 'original_real' in filter_data.columns else filter_data.columns[1]
            else:
                x_col = 'i'
                original_col = 'z_re'
            
            # Определяем колонки для коэффициентов (действительная часть)
            if 'psi_real' in coeffs_data.columns:
                coeff_col = 'psi_real'
            elif 'psi_re' in coeffs_data.columns:
                coeff_col = 'psi_re'
            elif 'psi_magnitude' in coeffs_data.columns:
                coeff_col = 'psi_magnitude'
            elif 'psi_abs' in coeffs_data.columns:
                coeff_col = 'psi_abs'
            else:
                coeff_col = coeffs_data.columns[2]
            
            # Сигнал и коэффициенты на одном графике (две оси Y)
            ax1 = ax
            ax1.plot(filter_data[x_col], filter_data[original_col], 
                    label='Сигнал', linewidth=1.5, alpha=0.7, color='blue')
            ax1.set_xlabel("Отсчет", fontsize=9)
            ax1.set_ylabel("Амплитуда сигнала", color='blue', fontsize=9)
            ax1.tick_params(axis='y', labelcolor='blue')
            ax1.grid(True, alpha=0.3)
            
            ax2 = ax1.twinx()
            # Используем первые 50 коэффициентов для наглядности
            n_coeffs = min(50, len(coeffs_data))
            ax2.stem(range(n_coeffs), coeffs_data[coeff_col].iloc[:n_coeffs], 
                    linefmt='r-', markerfmt='ro', basefmt='k-', label='Коэффициенты ψ')
            ax2.set_ylabel("Действительная часть ψ", color='red', fontsize=9)
            ax2.tick_params(axis='y', labelcolor='red')
            
            ax.set_title(f"{title} - Этап {stage}", fontsize=11)
    
    plt.savefig(os.path.join(BASE_DIR, "task3_all_bases_comparison.png"), dpi=150)
    plt.close(fig)
    print("Сохранен сводный график сравнения базисов")

def main():
    print("=" * 60)
    print("ЗАДАНИЕ 3: Анализ вейвлет-разложения и восстановления")
    print(f"Параметры: N={N}, A={A}, B={B}, w1={w1}, w2={w2}")
    print("=" * 60)
    
    # Проверяем наличие файлов
    print("\nПроверка файлов...")
    file_types = ['before', 'after']
    for basis, title in BASES:
        print(f"\n{title}:")
        for stage in [1, 2, 3, 4]:
            files_found = []
            for file_type in file_types:
                if read_coeffs_file(basis, stage, file_type) is not None:
                    files_found.append(f"coeffs_{file_type}")
            
            filter_file = read_filter_results(basis, stage)
            pq_file = read_partial_reconstruction(basis, stage)
            
            if filter_file is not None:
                files_found.append("filter")
            if pq_file is not None:
                files_found.append("pq")
            
            print(f"  Этап {stage}: {', '.join(files_found) if files_found else 'нет файлов'}")
    
    print("\n" + "=" * 60)
    print("Построение графиков для задания 3...")
    print("=" * 60)
    
    # 1. Графики скалярных произведений (действительная часть)
    print("\n1. Строим графики скалярных произведений (действительная часть)...")
    for basis, title in BASES:
        plot_scalar_products_for_basis(basis, title)
    
    # 1b. Графики скалярных произведений (мнимая часть)
    print("\n1b. Строим графики скалярных произведений (мнимая часть)...")
    for basis, title in BASES:
        plot_scalar_products_imaginary_for_basis(basis, title)
    
    # 2. Графики частичного восстановления
    print("\n2. Строим графики частичного восстановления...")
    for basis, title in BASES:
        plot_partial_reconstruction_for_basis(basis, title)
    
    # 3. График поведения шума
    print("\n3. Строим график поведения зашумления...")
    plot_noise_behavior_comparison()
    
    # 4. Сводный график сравнения
    print("\n4. Строим сводный график сравнения базисов...")
    plot_all_bases_comparison()
    
    print("\n" + "=" * 60)
    print("Готово! Все графики для задания 3 сохранены в директории:")
    print(BASE_DIR)
    print("=" * 60)
    
    # Список созданных файлов
    print("\nСозданные файлы графиков:")
    for file in sorted(os.listdir(BASE_DIR)):
        if file.startswith('task3_') and file.endswith('.png'):
            print(f"  - {file}")

if __name__ == "__main__":
    main()
