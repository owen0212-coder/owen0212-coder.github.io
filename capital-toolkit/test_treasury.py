import datetime as dt
import unittest
from update_treasury import parse_xml

def feed(date='2026-09-14', ten='4.97', two='4.65'):
    return f'''<feed xmlns="http://www.w3.org/2005/Atom" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices"><entry><d:NEW_DATE>{date}T00:00:00</d:NEW_DATE><d:BC_2YEAR>{two}</d:BC_2YEAR><d:BC_10YEAR>{ten}</d:BC_10YEAR><d:BC_30YEAR>5.34</d:BC_30YEAR></entry></feed>'''

class TreasuryTests(unittest.TestCase):
    def test_valid(self):
        row = parse_xml(feed(), dt.date(2026, 9, 15))[0]
        self.assertEqual(row['date'], '2026-09-14')
        self.assertEqual(row['yields']['10Y'], 4.97)
    def test_future_excluded(self):
        self.assertEqual(parse_xml(feed(), dt.date(2026, 9, 13)), [])
    def test_missing_excluded(self):
        self.assertEqual(parse_xml(feed(two=''), dt.date(2026, 9, 15)), [])
    def test_bad_range(self):
        for value in ['99', 'nan', 'inf']:
            with self.assertRaises(ValueError):
                parse_xml(feed(ten=value), dt.date(2026, 9, 15))

if __name__ == '__main__':
    unittest.main()
