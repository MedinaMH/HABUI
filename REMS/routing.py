# HABUI_APP/routing.py
from django.urls import re_path
from . import consumers
from REMS.consumers import AguaConsumer

websocket_urlpatterns = [
    re_path(r"ws/agua/$", AguaConsumer.as_asgi()),
    re_path(r'ws/energia/$', consumers.EnergiaConsumer.as_asgi()),
    re_path(r"ws/oxigeno/$", consumers.OxigenoConsumer.as_asgi()),
    re_path(r"ws/co2/$", consumers.CO2Consumer.as_asgi()),
    re_path(r"ws/temperatura/$", consumers.TemperaturaConsumer.as_asgi()),
    re_path(r"ws/humedad/$", consumers.HumedadConsumer.as_asgi()),
    re_path(r"ws/temperatura_alimentos/$", consumers.TemperaturaAlimentosConsumer.as_asgi()),
    re_path(r'ws/simulacion/(?P<simulacion_id>\w+)/$', consumers.SimulacionConsumer.as_asgi()),
]
