WITH recent_downloads AS (
  SELECT
    LOWER(project) AS project_lower,
    project,
    COUNT(*) AS download_count
  FROM
    `bigquery-public-data.pypi.file_downloads`
  WHERE
    DATE(timestamp) BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY) AND CURRENT_DATE()
  GROUP BY
    LOWER(project), project
  HAVING
    COUNT(*) >= 100
),
latest_metadata AS (
  SELECT
    LOWER(name) AS name_lower,
    name,
    description,
    summary,
    version,
    upload_time,
    ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY upload_time DESC) AS rn
  FROM
    `bigquery-public-data.pypi.distribution_metadata`
)
SELECT
  lm.name AS name,
  lm.description AS description,
  description_content_type,
  lm.summary AS summary,
  lm.version AS latest_version,
  rd.download_count AS number_of_downloads
FROM
  recent_downloads rd
JOIN
  latest_metadata lm
ON
  rd.project_lower = lm.name_lower
WHERE
  lm.rn = 1
ORDER BY
  rd.download_count DESC;
