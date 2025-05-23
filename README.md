# Django.educa.service

--! install python
--! clone this repo
pip install Django~=4.1.0

python manage.py migrate
python manage.py runserver

pip install django-braces==1.15.0


Отчет: Разработка платформы электронного обучения на Django
________________________________________
1. Введение
Проект представляет собой платформу электронного обучения с системой управления контентом (CMS). В отчете анализируются ключевые этапы разработки, включая создание моделей, настройку админ-панели, миграции, аутентификацию и тестирование функциональности.
________________________________________
2. Архитектура проекта
2.1. Модели данных
Основные модели:
1.	Subject (Предметы):
python
Copy
Download
class Subject(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
2.	Course (Курсы):
python
Copy
Download
class Course(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
3.	Module (Модули):
python
Copy
Download
class Module(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    order = OrderField(blank=True, for_fields=['course'])
Проблемы и решения:
•	Ошибка IndentationError (Снимок 3):
Исправлено выравнивание в Meta классе:
python
Copy
Download
class Meta:
    ordering = ['title']  # Было без отступа
•	Импорт OrderField (Снимок 4):
Поле OrderField должно быть определено в файле fields.py приложения, а не импортироваться из Django.
________________________________________
2.2. Администрирование
Настройка админ-панели:
•	Создан суперпользователь (Снимок 5):
bash
Copy
Download
python manage.py createsuperuser
•	Добавлены модели в admin.py:
python
Copy
Download
@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['title', 'slug']
Ошибки:
•	Пароль суперпользователя (Снимок 5-6):
Требуется пароль длиной ≥8 символов, не состоящий только из цифр.
________________________________________
2.3. Миграции и база данных
Логи миграций (Снимок 3):
bash
Copy
Download
python manage.py makemigrations
python manage.py migrate
•	Успешно применены миграции для courses, auth, admin и других приложений.
Тестирование моделей (Снимок 7):
•	Создание тестовых данных через shell:
python
Copy
Download
user = User.objects.last()
subject = Subject.objects.last()
course = Course.objects.create(subject=subject, owner=user, title='Course 1')
Module.objects.create(course=course, title='Module 1')
________________________________________
3. Диаграммы и визуализация
3.1. Схема базы данных
Diagram
Code
Download
1:N
1:N
1:N
Subject
Course
Module
User
3.2. Работа админ-панели (Снимок 8)
•	Разделы: Subjects, Courses, Users, Groups.
•	Интерфейс позволяет добавлять и редактировать объекты.
________________________________________
4. Ключевые проблемы и решения
1.	Ошибка IndentationError:
o	Причина: Неправильное выравнивание в class Meta.
o	Решение: Добавлен отступ для ordering.
2.	Ошибка импорта OrderField:
o	Причина: Попытка импорта несуществующего поля из Django.
o	Решение: Создан пользовательский OrderField в fields.py.
3.	Пароль суперпользователя:
o	Причина: Слишком простой пароль.
o	Решение: Использован более сложный пароль (например, dima2810).
________________________________________
5. Примеры кода
5.1. Пользовательское поле OrderField
python
Copy
Download
class OrderField(models.PositiveIntegerField):
    def pre_save(self, model_instance, add):
        if getattr(model_instance, self.attname) is None:
            qs = self.model.objects.all()
            value = qs.last().order + 1 if qs.exists() else 0
            setattr(model_instance, self.attname, value)
        return super().pre_save(model_instance, add)
5.2. Настройка админ-панели
python
Copy
Download
@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['title', 'subject', 'owner']
________________________________________
6. Заключение
6.1. Итоги
•	Успешно созданы модели Subject, Course, Module.
•	Настроена админ-панель для управления данными.
•	Решены проблемы с миграциями и аутентификацией.
6.2. Рекомендации
1.	Тестирование: Добавить unit-тесты для моделей и представлений.
2.	Безопасность: Использовать сложные пароли и HTTPS.
3.	Оптимизация: Добавить индексы для часто используемых полей.
