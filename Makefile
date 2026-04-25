dev:
	docker compose up

build:
	docker compose -f docker-compose.prod.yml build

test:
	docker compose exec backend python manage.py test

migrate:
	docker compose exec backend python manage.py migrate

makemigrations:
	docker compose exec backend python manage.py makemigrations

logs:
	docker compose logs -f

shell:
	docker compose exec backend python manage.py shell

createsuperuser:
	docker compose exec backend python manage.py createsuperuser

collectstatic:
	docker compose exec backend python manage.py collectstatic --noinput

deploy:
	docker compose -f docker-compose.prod.yml pull
	docker compose -f docker-compose.prod.yml up -d --build backend
	docker compose -f docker-compose.prod.yml restart nginx
