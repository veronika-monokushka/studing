import os
import pandas as pd
import matplotlib.pyplot as plt

BASE_DIR = r"C:\Users\Интернет\source\repos\чм7\чм7"

BASES = [
    ("haar", "Базис Хаара"),
    ("shannon", "Базис Шеннона"),
    ("d6", "Базис Добеши (D6)"),
]

# Ваши данные из C++ кода
N = 512  # 2^9 = 512
A = 2.35
B = 0.10
w1 = 2
w2 = 190
phi = 0.0

def read_filter_results(basis: str, stage: int):
    """Чтение результатов фильтрации (новое название файла)"""
    # Пробуем новое имя файла
    filepath = os.path.join(BASE_DIR, f"filter_results_{basis}_stage{stage}.csv")
    if os.path.exists(filepath):
        df = pd.read_csv(filepath)
        # Проверяем названия колонок
        print(f"Колонки в файле {basis}_stage{stage}: {df.columns.tolist()}")
        return df
    # Если нет нового, пробуем старое имя
    filepath_old = os.path.join(BASE_DIR, f"filter_{basis}_stage{stage}.csv")
    if os.path.exists(filepath_old):
        return pd.read_csv(filepath_old)
    return None

def read_coeffs_before(basis: str, stage: int):
    """Чтение коэффициентов до обработки (новое название файла)"""
    # Пробуем новое имя файла
    filepath = os.path.join(BASE_DIR, f"coeffs_before_{basis}_stage{stage}.csv")
    if os.path.exists(filepath):
        return pd.read_csv(filepath)
    # Если нет нового, пробуем старое имя
    filepath_old = os.path.join(BASE_DIR, f"filter_coeffs_before_{basis}_stage{stage}.csv")
    if os.path.exists(filepath_old):
        return pd.read_csv(filepath_old)
    return None

def read_pq_components(basis: str, stage: int):
    """Чтение P и Q компонент (новое название файла)"""
    # Пробуем новое имя файла
    filepath = os.path.join(BASE_DIR, f"pq_components_{basis}_stage{stage}.csv")
    if os.path.exists(filepath):
        return pd.read_csv(filepath)
    # Если нет нового, пробуем старое имя
    filepath_old = os.path.join(BASE_DIR, f"filter_prevPQ_{basis}_stage{stage}.csv")
    if os.path.exists(filepath_old):
        return pd.read_csv(filepath_old)
    return None

def plot_filter_line5_for_basis(basis: str, title: str):
    fig, axs = plt.subplots(4, 5, figsize=(28, 12), constrained_layout=True)
    fig.suptitle(f"Фильтрация по пункту 5 на этапах 1..4 — {title}\nN={N}, A={A}, B={B}, w1={w1}, w2={w2}", fontsize=14)

    for r, stage in enumerate([1, 2, 3, 4]):
        s = read_filter_results(basis, stage)
        c = read_coeffs_before(basis, stage)
        pq = read_pq_components(basis, stage)

        if s is None or c is None or pq is None:
            print(f"Нет данных для {basis}, этап {stage}")
            continue

        # Определяем названия колонок
        # Для файлов filter_results
        if 'original_real' in s.columns:
            # Новый формат
            x_col = 'index' if 'index' in s.columns else 'i'
            original_col = 'original_real'
            filtered_col = 'filtered_real'
        else:
            # Старый формат
            x_col = 'i'
            original_col = 'z_re'
            filtered_col = 'zf_re'

        # Для коэффициентов
        if 'psi_real' in c.columns:
            coeff_x_col = 'index' if 'index' in c.columns else 'idx'
            coeff_y_col = 'psi_real'
        else:
            coeff_x_col = 'idx'
            coeff_y_col = 'psi_re'

        # Для PQ компонент
        if 'P_real' in pq.columns:
            pq_x_col = 'index' if 'index' in pq.columns else 'i'
            p_col = 'P_real'
            q_col = 'Q_real'
        else:
            pq_x_col = 'i'
            p_col = 'Pprev_re'
            q_col = 'Qprev_re'

        # 1. Исходный сигнал
        axs[r, 0].plot(s[x_col], s[original_col], linewidth=1)
        axs[r, 0].set_title("Исходный сигнал z")
        axs[r, 0].grid(True)
        axs[r, 0].set_xlabel("Отсчет")
        axs[r, 0].set_ylabel("Амплитуда")

        # 2. Вейвлет-коэффициенты до обнуления
        axs[r, 1].plot(c[coeff_x_col], c[coeff_y_col], marker="o", markersize=3, linewidth=1)
        axs[r, 1].set_title(f"Re(<z, ψ_-{stage},k>) (до обнуления)")
        axs[r, 1].grid(True)
        axs[r, 1].set_xlabel("Индекс k")
        axs[r, 1].set_ylabel("Значение")

        # 3. Отфильтрованный сигнал
        axs[r, 2].plot(s[x_col], s[filtered_col], linewidth=1)
        axs[r, 2].set_title(f"Этап {stage}: z_filt = P_-{stage}(z)")
        axs[r, 2].grid(True)
        axs[r, 2].set_xlabel("Отсчет")
        axs[r, 2].set_ylabel("Амплитуда")

        # 4. P компонента предыдущего этапа
        prev_stage = max(stage-1, 1)
        axs[r, 3].plot(pq[pq_x_col], pq[p_col], linewidth=1)
        axs[r, 3].set_title(f"P_-{prev_stage}(z_filt)")
        axs[r, 3].grid(True)
        axs[r, 3].set_xlabel("Отсчет")
        axs[r, 3].set_ylabel("Амплитуда")

        # 5. Q компонента предыдущего этапа - ИСПРАВЛЕНИЕ ДЛЯ ШЕННОНА
        if basis == "shannon" and stage == 3:
            # Для Q3 по Шеннону значения могут быть очень маленькими
            # Проверяем масштаб значений
            q_values = pq[q_col].values
            q_max_abs = np.max(np.abs(q_values))
            
            if q_max_abs < 0.001:  # Если значения меньше 0.001
                # Увеличиваем масштаб для наглядности
                axs[r, 4].plot(pq[pq_x_col], q_values * 1000, linewidth=1, color='red')
                axs[r, 4].set_title(f"Q_-{prev_stage}(z_filt) ×1000\n(значения ×10⁻³)")
                axs[r, 4].set_ylabel("Амплитуда ×10⁻³")
            else:
                # Обычный график
                axs[r, 4].plot(pq[pq_x_col], q_values, linewidth=1, color='red')
                axs[r, 4].set_title(f"Q_-{prev_stage}(z_filt)")
                axs[r, 4].set_ylabel("Амплитуда")
        else:
            # Для остальных случаев обычный график
            axs[r, 4].plot(pq[pq_x_col], pq[q_col], linewidth=1)
            axs[r, 4].set_title(f"Q_-{prev_stage}(z_filt)")
            axs[r, 4].set_ylabel("Амплитуда")
        
        axs[r, 4].grid(True)
        axs[r, 4].set_xlabel("Отсчет")

    filename = f"plot_filter_line5_{basis}_stages1_2_3_4.png"
    plt.savefig(os.path.join(BASE_DIR, filename), dpi=180)
    plt.close(fig)
    print(f"Сохранен график: {filename}")
