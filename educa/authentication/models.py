import jwt
from django.db import models

from datetime import datetime, timedelta

from django.conf import settings 
from django.contrib.auth.models import (
	AbstractBaseUser, BaseUserManager, PermissionsMixin
)

class UserManager(BaseUserManager):
    """
    Django требует, чтобы кастомные пользователи определяли свой собственный
    класс Manager. Унаследовавшись от BaseUserManager, мы получаем много того
    же самого кода, который Django использовал для создания User (для демонстрации).
    """

    def create_user(self, username, email, password=None):
        """ Создает и возвращает пользователя с имэйлом, паролем и именем. """
        if username is None:
            raise TypeError('Users must have a username.')

        if email is None:
            raise TypeError('Users must have an email address.')

        user = self.model(username=username, email=self.normalize_email(email))
        user.set_password(password)
        user.save()

        return user

    def create_superuser(self, username, email, password):
        """ Создает и возввращет пользователя с привилегиями суперадмина. """
        if password is None:
            raise TypeError('Superusers must have a password.')

        user = self.create_user(username, email, password)
        user.is_superuser = True
        user.is_staff = True
        user.save()

        return user
    
class User(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(db_index=True, max_length=255, unique=True)
    email = models.EmailField(db_index=True, unique=True)
    is_active = models.BooleanField(default=True) # деактивировать учетку вместо ее полного удаления
    is_staff = models.BooleanField(default=False) # может войти в административную часть
    created_at = models.DateTimeField(auto_now_add=True)  # Временная метка создания объекта. 
    updated_at = models.DateTimeField(auto_now=True) # Временная метка показывающая время последнего обновления объекта.
    USERNAME_FIELD = 'username' #какое поле мы будем использовать для входа в систему
    REQUIRED_FIELDS = ['email']

    # Сообщает Django, что определенный выше класс UserManager
    # должен управлять объектами этого типа.
    objects = UserManager()

    def __str__(self):
        return self.username

    @property
    def token(self):
        """
        Позволяет получить токен пользователя путем вызова user.token, вместо
        user._generate_jwt_token(). Декоратор @property выше делает это
        возможным. token называется "динамическим свойством".
        """
        return self._generate_jwt_token()

    def get_full_name(self):
        return self.username

    def get_short_name(self):
        return self.username

    def _generate_jwt_token(self):
        """
        Генерирует веб-токен JSON, в котором хранится идентификатор этого
        пользователя, срок действия токена составляет 1 день от создания
        """
        dt = datetime.now() + timedelta(days=1)
        key = settings.JWT_SECRET_KEY

        token = jwt.JWT().encode({
            'id': self.pk,
            'exp': int(dt.timestamp())
        }, key #, algorithm='HS256'
        )

        return token # jwt.JWT().decode(token, key)


class Message(models.Model):
    id =        models.AutoField(primary_key=True)
    time =      models.DateTimeField(auto_now=True, null=True)
    msg_text =  models.TextField(max_length=300, null=True)

    user_from = models.ForeignKey(User,
                                  verbose_name=u'From',
                                  related_name='sent_messages',
                                  on_delete=models.CASCADE
    )
    user_to   = models.ForeignKey(User,
                                  verbose_name=u'To',
                                  related_name='received_messages',
                                  on_delete=models.CASCADE
    )
    def __str__(self):
        return self.id
    