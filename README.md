# Django.educa.service

--! install python
--! clone this repo
pip install Django~=4.1.0


python manage.py migrate
python manage.py runserver


python manage.py startapp MqttApp
python manage.py makemigrations MqttApp >>> python manage.py migrate

python manage.py showmigrations

pip install django-braces==1.15.0