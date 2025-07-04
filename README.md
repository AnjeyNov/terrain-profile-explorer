# Terrain Profile Explorer
Interaktywna aplikacja 3D do wizualizacji profilu terenu. Użytkownik może wybrać odcinek na mapie Europy, a następnie zobaczyć trójwymiarowe odwzorowanie wysokości wzdłuż wybranej trasy oraz odpowiadający jej wykres profilu wysokości.

## Cel projektu
- Zwizualizowanie profilu terenu w wybranym regionie Europy w atrakcyjny i intuicyjny sposób.
-Umożliwienie użytkownikowi eksploracji zmian wysokości wzdłuż dowolnej trasy.
- Wykorzystanie nowoczesnych technik grafiki komputerowej do edukacyjnej i badawczej pracy z danymi geograficznymi.

## Techniki i metody grafiki komputerowej
- Ładowanie i przetwarzanie cyfrowych modeli wysokości terenu (DEM).
- Generowanie geometrii 3D terenu na podstawie danych DEM.
- Mapowanie tekstur powierzchni (mapy wysokości, zdjęcia satelitarne).
- Wizualizacja profilu wysokości w formie interaktywnego wykresu.
- Praca z układami współrzędnych i przekształceniami (geograficzne i ekranowe).

## Wymagania

- Node.js i npm

## Instalacja i uruchomienie

```bash
npm install 
npx vite
```

![Ekran wyboru terenu](image%200.png)

![Ekran wyboru terenu z już wybranym terenem](image%201.png)

![Reprezentacja 3D z nałożonymi teksturami z Open Street Map](image%202.png)

![Reprezentacja 3D z nałożonymi teksturami DEM i zbudowanym profilem wysokościowym](image%203.png)