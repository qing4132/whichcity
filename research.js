const cities = ['Fuzhou', 'Nanchang', 'Changsha', 'Kunming', 'Urumqi', 'Lanzhou', 'Xining', 'Yinchuan', 'Hohhot', 'Shijiazhuang', 'Taiyuan', 'Tianjin', 'Chongqing', 'Suzhou', 'Wuxi', 'Changzhou', 'Nantong', 'Yangzhou', 'Zhenjiang', 'Taizhou'];

async function fetchData() {
  for (const city of cities) {
    const url = `https://www.numbeo.com/property-investment/city_result.jsp?country=China&city=${city}`;
    try {
      const response = await fetch(url);
      const text = await response.text();
      // Find the line with Price per Square Meter to Buy Apartment in City Centre
      const lines = text.split('\n');
      let found = false;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Price per Square Meter to Buy Apartment in City Centre')) {
          // Next lines might have the price
          for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
            const match = lines[j].match(/(\d+(?:,\d+)*)/);
            if (match) {
              console.log(`${city}: ${match[1]} USD`);
              found = true;
              break;
            }
          }
          break;
        }
      }
      if (!found) {
        console.log(`${city}: Not found`);
      }
    } catch (e) {
      console.log(`${city}: Error ${e.message}`);
    }
    // delay 2 seconds to avoid rate limit
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

fetchData();