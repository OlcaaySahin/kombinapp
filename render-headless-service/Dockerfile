# Playwright'in resmi imaji: Chromium + tum sistem bagimliliklari onceden kurulu geliyor.
# Bu, Render'in duz Node build ortaminda "playwright install --with-deps" icin gereken
# root/apt erisiminin olmamasi sorununu tamamen ortadan kaldiriyor.
FROM mcr.microsoft.com/playwright:v1.61.1-jammy

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./

EXPOSE 3000

CMD ["node", "server.js"]
