# Порівняння рельєфу Земля / Місяць / Марс

Скрипт `compute_terrain_stats.py` рахує для всіх цілей і земних майданчиків з `analogs.ts` однакові показники
(середній нахил, перепад висот, шорсткість) і записує їх у `artifacts/terra-lunar-atlas/src/data/terrain-stats.json`.
Сайт читає цей файл і показує порівняння на сторінці Explorer.

## Запуск (Windows, з кореня репозиторію)

```
py -m pip install -r scripts/terrain-stats/requirements.txt
py scripts/terrain-stats/compute_terrain_stats.py
```

Без аргументів скрипт читає висоти прямо з USGS за посиланнями (завантажуються лише потрібні фрагменти):

- Місяць: https://planetarymaps.usgs.gov/mosaic/Lunar_LRO_LOLA_Global_LDEM_118m_Mar2014.tif (≈ 8 ГБ, LOLA, 118 м)
- Марс: https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif (≈ 2 ГБ, MOLA, 463 м)

Якщо читання по мережі йде надто повільно або обривається, завантаж файли й вкажи шляхи:

```
py scripts/terrain-stats/compute_terrain_stats.py --moon-dem D:\data\Lunar_LRO_LOLA_Global_LDEM_118m_Mar2014.tif --mars-dem D:\data\Mars_MGS_MOLA_DEM_mosaic_global_463m.tif
```

Для Землі скрипт звертається до Open Topo Data (SRTM 30 м, а де SRTM немає — ASTER 30 м), приблизно 1 запит на секунду.

## Після запуску

1. Перевір у консолі, що для кожної цілі й майданчика надрукувалися числа (а не `None`).
2. Закоміть оновлений `terrain-stats.json` і зроби push у `main`. Vercel перебудує сайт.

## Важливо

- Усі тіла рахуються з одним кроком сітки (500 м): нахил залежить від бази вимірювання.
- Значення Місяця в файлі USGS зберігаються як int16 і діляться на 2 (`--moon-scale 0.5` за замовчуванням).
- Абсолютні висоти не порівнюються: у Землі, Місяця й Марса різні нульові рівні.
