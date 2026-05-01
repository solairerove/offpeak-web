1) # **Как пользователь (путешественник, который ищет выгодные цены)**

## **ПЛЮСЫ**

* **Сам визуал карты, ее подача в таблице с рейтингом** –пользователь быстро считывает “где дешево, а где дорого”  
* Визуал хорошо работает для **первичного сканирования направления**  
* Визуал упрощает сравнение сезонов без ручного поиска  
* Присутствует концепт “увидеть рынок сразу” – это сильный UX-паттерн, особенно для travel направления

## **МИНУСЫ с т.зр. UX, которые я бы поменяла**

### **1\. Не хватает действия после инсайта** Пользователь видит, “ага в этот месяц дешево”

Но дальше, естественно, вопрос: “а что делать дальше?”

- куда нажать?  
- где забронировать?  
- какие отели?  
- это средняя цена или конкретные предложения?

*\-\> Сейчас у вас хороший аналитический продукт, но он пока не доработан для “бронирования”, для “второго касания”.* 

### **2\. Нет контекста “почему дешево”**

Да, у вас указаны погодные условия и праздники – аргументация с т. зр. климата, но… может есть еще что добавить, чтоб подкрепить мнение пользователя: 

*\-\> Пока что без сильной аргументации, тепловая карта не будет до конца рабочей, останется лишь красивая картинка, которую легко считать, но она не аргументирована* 

### **3\. Возможно для наивного пользователя, слишком сложный язык / профессиональный**

Если эту карту будет читать обычный пользователь, то он хочет простоту: “увидел, что дешево, давай мне сразу предложения, чтоб я не трудился над поиском сам”. 

То есть, вы сразу даете ему детализацию:

- лучшие дни для поездки  
- самые дешевые недели  
- какие отели / направления я могу выбрать (возможно, перейдя по ссылке, если сможете подключить платформы)

### **4\. Нет конкретики, детальности**

Нет примерного: типа жилья, длительности поездки и пр.

Если я смотрю, как путешественник, который ищет себе дешевый отпуск, то мне не хватает фильтрации

**5\. Там есть раздел с визами**

Мы вчера говорили, что да, было бы прикольно ввести, кому нужна / не нужна. Это сразу бы давало понимание пользователю “нужно ли мне еще закладывать в бюджет визу” 

**ИТОГ:**  
**Что я бы добавила:**

- фильтр: бюджет / страна / тип жилья  
- кнопка: **Show me cheapest trip**  
- “Best value week” (не просто месяцы, если это возможно)  
- кликабельное углубление в данные:  
   дата – отели – цены – бронирование  
- добавила бы аргументации, не только климатические условия и праздники (те же, каникулы, “уехали на зимовку” и т.д.) 

# **2\) Как владелец отеля (просадка, загрузка, revenue)**

С этой стороны, на мой взгляд, **кейс продукта будет сильнее** 

**ПЛЮСЫ**  
**\- Тепловая карта позволяет увидеть:**

1) low demand periods  
2) сезонные просадки  
3) динамику спроса

**\-Хорошо подходит для продумывания:**

1) ценовой стратегии  
2) управление доходами, бюджетом  
3) планирование броней, заведомо понимая то, что может быть аншлаг и овербукинг 

## **МИНУСЫ, что можно доработать** 

### **1\. Нет “подсказки действия”**

Да, я как владелец, вижу просадку, но:

- **что с ней делать?**  
- **как и насколько поднять/опустить цену? (то есть, тут анализ конкурентов)**  
- **когда запускать акции?**

*\-\> Сейчас это хороший dashboard, но если вы сможете еще и сделать аналитику с решением, это будет круто и мощно* 

### **2\. Нет прогнозов, аргументации** 

Сейчас есть только “что будет в 2027”, но мне не хватает аргументации, с чего вы это взяли. Где мне посмотреть статистику предыдущего года хотя бы. Очень важно подкрепить это мнение чем-то  
Для отель-владельцев это критично, так как они не могут быть уверены в том, что зачем им понижать/повышать стоимость и потом остаться в просаке 

### **3\. Нет сегментации спроса**

Для меня, как для того, кто занимается аналитикой букингов нашего отеля, очень важно учесть следующие факторы: 

- рабочие дни / выходные дни (где больше броней в эти периоды)  
- граждане какой страны нас посещают, кто чаще приезжает в конкретные периоды, на кого пускать рекламу  
- брони происходят задолго до активного периода или в последний момент (на что мне расчитывать?) 

**ИТОГ:** 

Если вы хотите выходить на B2B, то рассмотрите возможность добавить:   
**1\. Интерпретация**

Например:

1) я кликаю на май месяц – открываете вкладка и там внизу – с 12 по 18 мая, 2027 ожидается прирост в бронях на 32% из\-за праздников” (ну, например)  
2) \[...\] – с 20 по 30 октября, 2027 рекомендуем снизить стоимость на 18% из\-за тайфунов” 

**2\. Сделать фильтрацию** 

Например: 

1) средняя цена номера за ночь в определенный месяц  
2) заполняемость  
3) ожидаемый доход

**3\. Была бы крутая фича, если бы ИИ мог бы рассчитывать прогноз по:** 

* Какое промо / акцию сделать в период  
* Какие выставить стоимости (на сколько % можно поднять)  
* На какие даты / периоды у отеля возможны просадки

В общем, сейчас это очень хороший каркас и база, которую нужно доработать исходя из того, на кого вы хотите этот продукт продавать:  
B2C – наивные пользователи, путешественники, которые ищут дешевые и выгодные предложения

B2B – бизнесы, владельцы отелей, которые будут рассматривать вашу тепловую карту, как инструмент для работы с прибылью и построением ожидаемости 

И далее от этого уже отталкиваться, какие фичи добавлять

Ну, и по визуалу: адаптация для мобилки (так как 80% пользователей будут смотреть через телефон)  
Поправить немного неровности в кнопках (где-то стрелочка не посередине, где\-то картинка налезает   
![][image1]

такие нюансы… 

 

[image1]: <data:image/png;base64,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>