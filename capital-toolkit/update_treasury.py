"""Refresh the site's public-domain daily Treasury curve; no API key required.

Run from any directory. Output is generated data, not hand-authored source.
Network/validation failures leave the previous snapshot untouched.
"""
import datetime as dt
import json
from pathlib import Path
import urllib.request
import xml.etree.ElementTree as ET

BASE = Path(__file__).resolve().parent
SOURCE = 'https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value='
FIELDS = {'1M': 'BC_1MONTH', '3M': 'BC_3MONTH', '6M': 'BC_6MONTH', '1Y': 'BC_1YEAR', '2Y': 'BC_2YEAR', '3Y': 'BC_3YEAR', '5Y': 'BC_5YEAR', '7Y': 'BC_7YEAR', '10Y': 'BC_10YEAR', '20Y': 'BC_20YEAR', '30Y': 'BC_30YEAR'}

def parse_xml(data, today):
    root = ET.fromstring(data)
    ns = {'a': 'http://www.w3.org/2005/Atom', 'd': 'http://schemas.microsoft.com/ado/2007/08/dataservices'}
    rows = []
    for entry in root.findall('a:entry', ns):
        date_node = entry.find('.//d:NEW_DATE', ns)
        if date_node is None or not date_node.text:
            continue
        day = date_node.text[:10]
        if dt.date.fromisoformat(day) > today:
            continue
        yields = {}
        for label, tag in FIELDS.items():
            node = entry.find('.//d:' + tag, ns)
            if node is not None and node.text:
                value = float(node.text)
                if not -5 <= value <= 30:
                    raise ValueError('Unexpected yield range')
                yields[label] = value
        if all(key in yields for key in ['2Y', '10Y', '30Y']):
            rows.append({'date': day, 'yields': yields})
    return rows

def main():
    today = dt.datetime.now(dt.timezone.utc).date()
    rows = []
    # Prior year provides context even during the first trading days of January.
    for year in [today.year - 1, today.year]:
        request = urllib.request.Request(SOURCE + str(year), headers={'User-Agent': 'CapitalToolkit/1.0 (public Treasury research dashboard)'})
        with urllib.request.urlopen(request, timeout=60) as response:
            rows.extend(parse_xml(response.read(), today))
    rows = sorted({r['date']: r for r in rows}.values(), key=lambda r: r['date'])[-260:]
    if len(rows) < 2:
        raise ValueError('Insufficient Treasury data; retaining previous snapshot')
    target = BASE / 'data' / 'treasury.json'
    if target.exists():
        previous = json.loads(target.read_text())
        if previous['rows'][-1]['date'] > rows[-1]['date']:
            raise ValueError('Feed is older than existing snapshot; refusing regression')
    output = {'source': 'U.S. Department of the Treasury', 'sourceUrl': SOURCE + str(today.year),
              'retrievedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'rows': rows}
    target.parent.mkdir(parents=True, exist_ok=True)
    temp = target.with_suffix('.tmp')
    temp.write_text(json.dumps(output, indent=2) + '\n')
    temp.replace(target)
    print(f"Treasury snapshot: {rows[-1]['date']} · {len(rows)} observations · 10Y {rows[-1]['yields']['10Y']:.2f}%")

if __name__ == '__main__':
    main()
