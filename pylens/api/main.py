import logging

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.requests import Request

from pylens.api.data_loader import ApiDataLoader
from pylens.api.models import QueryModel, SearchResponse
from pylens.config import Config
from pylens.embeddings.simple_vector_database import SimpleVectorDatabase
from pylens.utils.logging import setup_logging
from pylens.utils.score_calculator import calculate_score

setup_logging()
logging.info("Initializing backend...")

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

load_dotenv()
config = Config()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

data_loader = ApiDataLoader(config)
df_packages, df_embeddings = data_loader.load_dataset()

model = SentenceTransformer(config.EMBEDDINGS_MODEL_NAME)
vector_database = SimpleVectorDatabase(embeddings_model=model, df_embeddings=df_embeddings)


@app.post("/api/search", response_model=SearchResponse)
@limiter.limit("6/minute")
async def search(query: QueryModel, request: Request):
    """
    Search for the packages whose summary and description have the highest similarity to the query.
    We take the top_k * 2 most similar packages, and then calculate weighted score based on the similarity and weekly downloads.
    The top_k packages with the highest score are returned.
    """

    # if query.top_k > 100:
    #     raise HTTPException(status_code=400, detail="top_k cannot be larger than 100.")

    logging.info(f"Searching for similar projects. Query: '{query.query}'")
    df_matches = vector_database.find_similar(query.query, top_k=int(query.top_k))
    # df_matches = vector_database.find_similar(query.query, top_k=int(query.top_k * 2))
    df_matches = df_matches.join(df_packages, how="left", on="name")
    logging.info(
        f"Fetched the {len(df_matches)} most similar projects. Calculating the weighted scores and filtering..."
    )

    df_matches = calculate_score(
        df_matches, weight_similarity=config.WEIGHT_SIMILARITY, weight_weekly_downloads=config.WEIGHT_WEEKLY_DOWNLOADS
    )
    df_matches = df_matches.sort("score", descending=True)

    if len(df_matches) > query.top_k:
        df_matches = df_matches.head(query.top_k)

    logging.info(f"Returning the {len(df_matches)} best matches.")
    df_matches = df_matches.select(["name", "similarity", "summary", "weekly_downloads"])
    return SearchResponse(matches=df_matches.to_dicts())
