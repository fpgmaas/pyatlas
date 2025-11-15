import axios from "axios";

interface Match {
  name: string;
  similarity: number;
  weekly_downloads: number;
  summary: string;
}

interface SearchResponse {
  matches: Match[];
  warning?: boolean;
  warning_message?: string;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export const handleSearch = async (
  query: string,
  sortField: string,
  sortDirection: string,
  setResults: React.Dispatch<React.SetStateAction<Match[]>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setError: React.Dispatch<React.SetStateAction<string>>,
) => {
  setLoading(true);
  setError("");
  try {
    const response = await axios.post<SearchResponse>(
      `${apiUrl}/search`,
      {
        query: query,
        top_k: 3000,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const { matches, warning, warning_message } = response.data;

    if (warning && warning_message) {
      console.warn("Warning from API:", warning_message);
    }

    setResults(sortResults(matches, sortField, sortDirection));
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      setError("Rate limit reached. Please wait a minute and try again.");
    } else {
      setError("Error fetching search results.");
    }
    console.error("Error fetching search results:", error);
  } finally {
    setLoading(false);
  }
};

export const sortResults = (
  data: Match[],
  field: string,
  direction: string,
): Match[] => {
  return [...data].sort((a, b) => {
    // @ts-ignore
    if (a[field] < b[field]) return direction === "asc" ? -1 : 1;
    // @ts-ignore
    if (a[field] > b[field]) return direction === "asc" ? 1 : -1;
    return 0;
  });
};
