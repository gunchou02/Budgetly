FROM php:8.3-fpm-alpine

RUN set -eux; \
    apk add --no-cache \
        bash \
        git \
        icu-dev \
        libzip-dev \
        oniguruma-dev \
        unzip \
        zip; \
    apk add --no-cache --virtual .build-deps $PHPIZE_DEPS; \
    docker-php-ext-install \
        bcmath \
        intl \
        mbstring \
        pdo_mysql \
        zip; \
    pecl install redis-6.3.0; \
    docker-php-ext-enable redis; \
    apk del .build-deps

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY uploads.ini /usr/local/etc/php/conf.d/99-budgetly-uploads.ini
COPY entrypoint.sh /usr/local/bin/budgetly-entrypoint

RUN chmod +x /usr/local/bin/budgetly-entrypoint

WORKDIR /var/www/html

ENTRYPOINT ["budgetly-entrypoint"]
CMD ["php-fpm"]
