FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
    bash \
    git \
    icu-dev \
    libzip-dev \
    oniguruma-dev \
    unzip \
    zip \
    && docker-php-ext-install \
    bcmath \
    intl \
    mbstring \
    pdo_mysql \
    zip

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY entrypoint.sh /usr/local/bin/budgetly-entrypoint

RUN chmod +x /usr/local/bin/budgetly-entrypoint

WORKDIR /var/www/html

ENTRYPOINT ["budgetly-entrypoint"]
CMD ["php-fpm"]
