import unittest
from app import create_app


class ResearchHubAPITestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.client = self.app.test_client()

    def test_stats_endpoint(self):
        """Verify /api/stats returns status 200, success flag, and valid paper totals."""
        response = self.client.get('/api/stats')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        self.assertIn('total_papers', data['data'])
        self.assertGreater(data['data']['total_papers'], 0)
        self.assertIn('sources', data['data'])

    def test_filters_endpoint(self):
        """Verify /api/papers/filters returns sources, paper types, and year range."""
        response = self.client.get('/api/papers/filters')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        self.assertIn('sources', data['data'])
        self.assertIn('paper_types', data['data'])
        self.assertIn('year_range', data['data'])

    def test_search_papers_pagination(self):
        """Verify /api/papers pagination and structure."""
        response = self.client.get('/api/papers?page=1&limit=5')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(len(data['data']), 5)
        self.assertEqual(data['pagination']['page'], 1)
        self.assertEqual(data['pagination']['limit'], 5)
        self.assertGreater(data['pagination']['total'], 0)

    def test_search_papers_query(self):
        """Verify keyword search returns relevant results."""
        response = self.client.get('/api/papers?q=learning&limit=5')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        self.assertGreater(data['pagination']['total'], 0)

    def test_filter_by_source(self):
        """Verify filtering by specific academic source."""
        response = self.client.get('/api/papers?source=arxiv&limit=5')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        for paper in data['data']:
            self.assertIn('arxiv', paper['sources'])

    def test_get_paper_details(self):
        """Verify retrieving details of a single paper."""
        # First retrieve a valid id
        search_res = self.client.get('/api/papers?limit=1')
        first_paper = search_res.get_json()['data'][0]
        paper_id = first_paper['id']

        # Retrieve by id
        detail_res = self.client.get(f'/api/papers/{paper_id}')
        self.assertEqual(detail_res.status_code, 200)
        data = detail_res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['id'], paper_id)
        self.assertEqual(data['data']['title'], first_paper['title'])

    def test_non_existent_paper_404(self):
        """Verify 404 response for non-existent paper ID."""
        response = self.client.get('/api/papers/999999999')
        self.assertEqual(response.status_code, 404)
        data = response.get_json()
        self.assertFalse(data['success'])

    def test_invalid_parameters_handling(self):
        """Verify invalid query parameter validation."""
        response = self.client.get('/api/papers?page=-1')
        self.assertEqual(response.status_code, 400)
        response = self.client.get('/api/papers?sort=invalid_sort')
        self.assertEqual(response.status_code, 400)


if __name__ == '__main__':
    unittest.main()

