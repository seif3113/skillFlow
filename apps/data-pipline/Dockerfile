FROM astrocrpublic.azurecr.io/runtime:3.1-13

# Chromium/chromedriver are installed via packages.txt by the Astro build process.
# Set env vars so Selenium can find them.
ENV CHROME_BIN=/usr/bin/chromium
ENV CHROMEDRIVER_PATH=/usr/bin/chromedriver
ENV DISPLAY=:99

# Copy the scrape/ package into the container so DAGs can import it.
# Add scrape/ to PYTHONPATH so "from shared.xxx" imports work unchanged.
COPY scrape/ /usr/local/airflow/scrape/
ENV PYTHONPATH="${PYTHONPATH}:/usr/local/airflow/scrape"
