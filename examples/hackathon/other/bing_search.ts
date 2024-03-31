import axios from 'axios';

// Define your Bing Search API key and endpoint
const bingSearchApiKey: string = process.env.BING_SEARCH_API_KEY!;
const bingSearchEndpoint: string = 'https://api.bing.microsoft.com/v7.0/search';

// docs: https://learn.microsoft.com/en-us/bing/search-apis/bing-web-search/reference/endpoints
async function searchBing(query: string): Promise<void> {
    try {
        const response = await axios.get(bingSearchEndpoint, {
            headers: {
                'Ocp-Apim-Subscription-Key': bingSearchApiKey,
                'Accept-Encoding': 'identity',
            },
            params: {
                q: query,
                count: 10, // Number of results to return
                offset: 0, // Results offset
                mkt: 'en-US', // Market code https://learn.microsoft.com/en-us/bing/search-apis/bing-web-search/reference/market-codes#country-codes
                safesearch: 'Moderate', // Safe search settings
            },
        });

        console.log('Search Results:', response.data);
    } catch (error) {
        console.error('Error during Bing Search API call:', error);
    }
}

// Example search query
searchBing('human design gate 12');