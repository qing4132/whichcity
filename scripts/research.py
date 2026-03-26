import urllib.request
import re
import time

cities = ['Fuzhou', 'Nanchang', 'Changsha', 'Kunming', 'Urumqi', 'Lanzhou', 'Xining', 'Yinchuan', 'Hohhot', 'Shijiazhuang', 'Taiyuan', 'Tianjin', 'Chongqing', 'Suzhou', 'Wuxi', 'Changzhou', 'Nantong', 'Yangzhou', 'Zhenjiang', 'Taizhou']

for city in cities:
    url = f'https://www.numbeo.com/property-investment/city_result.jsp?country=China&city={city}'
    try:
        with urllib.request.urlopen(url) as response:
            html = response.read().decode('utf-8')
            match = re.search(r'Price per Square Meter to Buy Apartment in City Centre.*?(\d+(?:,\d+)*)', html)
            if match:
                print(f'{city}: {match.group(1)} USD')
            else:
                print(f'{city}: Not found')
    except Exception as e:
        print(f'{city}: Error {e}')
    time.sleep(2)