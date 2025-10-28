import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy.interpolate import UnivariateSpline
import os

def main():
    # 1. Загрузка данных из файла
    df_original = pd.read_csv(os.path.join(notebook_path, 'spline_results_W1.csv'))

    print("Загрузка данных из файла...")
    print(f"Загружено наблюдений: {len(df_original)}")

    # 2. Извлечение данных
    x = df_original['observation_number'].values
    y = df_original['original_value'].values

    # Вычисление статистик
    mean = np.mean(y)
    stddev = np.std(y)
    print(f"Статистики данных: M={mean:.2f}, σ={stddev:.2f}")

    # 3. Параметры сглаживания (s в UnivariateSpline)
    # Меньше s = больше сглаживания, больше s = ближе к данным
    s_values = [1, 1000, 5000, 10000, 50000]

    # 4. Вычисление сплайнов
    splines = []
    for s in s_values:
        spline = UnivariateSpline(x, y, s=s)
        splines.append(spline)

    # 5. Создание CSV файла с результатами
    df = pd.DataFrame({'observation_number': x, 'original_value': y})
    for i, (s, spline) in enumerate(zip(s_values, splines)):
        df[f's_{s}'] = spline(x)

    df.to_csv('spline_results_scipy.csv', index=False)

    # 6. Визуализация
    plt.figure(figsize=(15, 8))

    # Исходные данные (прореженные)
    k = 99
    plt.scatter(x[::k], y[::k], marker='x', color='black', s=100,
                label='Исходные данные', alpha=0.6)

    # Сплайны
    colors = ['red', 'blue', 'green', 'orange', 'purple']
    for i, (s, spline, color) in enumerate(zip(s_values, splines, colors)):
        y_smooth = spline(x[::k])
        plt.plot(x[::k], y_smooth, color=color, linewidth=1.5,
                label=f's = {s}')

    plt.xlabel('Номер наблюдения')
    plt.ylabel('Значение')
    plt.title('Сглаживающие сплайны (Scipy UnivariateSpline)\n (каждое 100-е наблюдение)')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig('spline_scipy.png', dpi=300, bbox_inches='tight')
    plt.show()

    print("\nРезультаты работы:")
    print("- Загружены данные из файла: spline_results_W1.csv")
    print("- Создан файл: spline_results_scipy.csv (результаты Scipy)")
    print("- Создан файл: spline_scipy.png (график)")
    print(f"- Обработано наблюдений: {len(df_original)}")
    print("- Параметры сглаживания s:", " ".join(str(s) for s in s_values))
    print(f"- Статистики данных: M={mean:.2f}, σ={stddev:.2f}")

if __name__ == "__main__":
    main()