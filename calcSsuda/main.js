"use strict";

function calculate(){
    // Отыскать элементы ввода и вывода в документе
    var amount = document.getElementById("amount");
    var apr = document.getElementById("apr");
    var years = document.getElementById("years");
    var zipcode = document.getElementById("zipcode");
    var payment = document.getElementById("payment");
    var total = document.getElementById("total");
    var totalinterest = document.getElementById("totalinterest");
    //Получить ввод пользователя из элементов ввода
    var principal = parseFloat(amount.value);
    //Преобразование процентной ставки
    var interest = parseFloat(apr.value) / 100 / 12;
    //Преобразование периода платежей в месяцах
    var payments = parseFloat(years.value) * 12;
    //Вычисление суммы ежемесячного платежа 
    var x = Math.pow(1 + interest, payments); //Math.pow()вычисляет степень
    var monthly = (principal*x*interest)/(x-1);
    if (isFinite(monthly)) {
        //Заполнить поля вывода , округлив результат до 2 знаков
        payment.innerHTML = monthly.toFixed(2);
        total.innerHTML = (monthly*payments).toFixed(2);
        totalinterest.innerHTML = ((monthly*payments) - principal).toFixed(2);
        //Сохраняем вод пользователя
        save(amount.value, apr.value, years.value, zipcode.value);
        try {
            getLenders(amount.value, apr.value, years.value, zipcode.value);
        } catch(e) {}
        chart(principal, interest, monthly, payments);
} else {
    payment.innerHTML = "";
    total.innerHTML = "";
    totalinterest.innerHTML = "";
    chart();
}
}

function save(amount, apr, years, zipcode){
    if(window.localStorage){//Выполняет сохранение , если поддерживается
        localStorage.loan_amount = amount;
        localStorage.loan_apr = apr;
        localStorage.loan_years = years;
        localStorage.loan_zipcode = zipcode;
    }
}
//Автоматически восстановить поля ввода при загрузке документа
window.onload = function(){
    if (window.localStorage && localStorage.loan_amount){
        document.getElementById("amount").value = localStorage.loan_amount;
        document.getElementById("apr").value = localStorage.loan_apr;
        document.getElementById("years").value = localStorage.loan_years;
        document.getElementById("zipcode").value = localStorage.loan_zipcode;
    }
};
//Передать ввод пользователя серверу, если такой имеется
function getLenders(amount, apr, years, zipcode){
    //Если браузер не поддерживает XMLHttpRequest не делать ничего
    if (!window.XMLHttpRequest) return;
    //Отыскать элемент для отображения списка кредитных учреждений
    var ad = document.getElementById("lenders");
    //Выйти, если элемент отсутствует
    if(!ad) return;
    //Преобразовать ввод пользователя в параметры запроса в строке URL
    var url = getLenders.php + //Адрес URL службы плюс данные пользоателя
    "?amt=" + encodeURIComponent(amount) + //Адрес URL службы плюс данные пользоателя
    "?apr=" + encodeURIComponent(apr) + //Адрес URL службы плюс данные пользоателя
    "?yrs=" + encodeURIComponent(years) + //Адрес URL службы плюс данные пользоателя
    "?zip=" + encodeURIComponent(zipcode); //Адрес URL службы плюс данные пользоателя
    //Получить содержимое по заданному адресу URL с помощью XMLHttpRequest
    var req = new XMLHttpRequest(); //Создать новый запрос
    req.open("GET", url); //Указать тип запроса HTTP GET для url
    req.send(null); //Отправить запрос без тела
    //Перед возвратом зарегистрировать обработчик события 
    //Приём асинхронного программирования
    req.onreadystatechange = function() {
        if (req.readyState == 4 && req.status == 200){
            //Если мы попали сюда , следовательно, был получен корретный HTTP-ответ
            var response = req.responseText; //HTTP ответ в виде строки
            var lenders = JSON.parse(response); //Преобразовать в JS-массив
            //Преобразовать массив объектов lender в HTML-строку
            var list = "";
            for(var i = 0; i < lenders.length; i++){
                list += "<li><a href='"+ lenders[i].url +"'>" + lenders[i].name + "</a>";
            }
            //Отобразить полученную html-строку в элементе, ссылка на который была получена выше
            ad.innerHTML = "<ul>"+list+"</ul>";
        }
    }
}
//График помесячного изменения остатка по кредиту, а также графики сумм,
//выплачиваемых в погашенеи кредита и по процентам в html-элементе <canvas>
//Если вызывается без аргументов, просто очищает ранее нарисованные графики
function chart(principal, interest, monthly, payments){
    var graph = document.getElementById("graph");//Ссылка на тег canvas
    graph.width = graph.width;       //Магия очистки элемента canvas
    //Если функция вызвана без аргументов или браузер не поддерживает canvas
    //просто вернуть управление
    if (arguments.length == 0 || !graph.getContext) return;
    //Получить объект "контекста" для элемента canvas,
    //который определяет набор методов рисования
    var g = graph.getContext("2d"); //Рисование выполняется с помощью этого объекта
    var width = graph.width, height = graph.height; //получить размер холста

    //Следующие функции преобразуют количество месячных платежей
    //и денежные суммы в пиксели
    function paymentToX(n) {return n * width/payments;}
    function amountToY(a) {return height-(a*height/(monthly*payments*1.05));}
    //Платежи - прямая линия из точки (0,0) в точку (payments, monthly*payments)
    g.moveTo(paymentToX(0), amountToY(0)); //из нижнего левого угла
    g.lineTo(paymentToX(payments), amountToY(monthly*payments)); //В правый верхний
    g.lineTo(paymentToX(payments), amountToY(0)); //в правый нижний
    g.closePath(); //И обратно в начало
    g.fillStyle = "#f88"; //светло-красный
    g.fill();
    g.font = "bold 12px sans- serif";
    g.fillText("Итого процентные платежи", 20,20);
    //кривая накопленной суммы погашения кредита
    var equity = 0;
    g.beginPath();//новая фигура
    g.moveTo(paymentToX(0), amountToY(0)); //из левого нижнего угла
    for(var p = 1; p <= payments; p++) {
        //для каждого платежа выяснить долю выплат по процентам
        var thisMonthsInterest = (principal-equity)*interest;
        equity += (monthly - thisMonthsInterest); //остаток - погашение кред
        g.lineTo(paymentToX(p), amountToY(equity)); //линию до этой точки
    }
    g.lineTo(paymentToX(payments), amountToY(equity*payments)); //В правый верхний
    g.lineTo(paymentToX(payments), amountToY(0));//линию до оси Х
    g.closePath();                               //и опять в нач.точку
    g.fillStyle = "green";                       //зеленый цвет
    g.fill(); // залить область под кривой
    g.fillText("Всего", 20,35);

    //повторить цикл, как выше , но нарисовать график остатка по кредиту
    var bal = principal;
    g.beginPath();
    g.moveTo(paymentToX(0), amountToY(bal));
    for(var p = 1; p <= payments; p++){
        var thisMonthsInterest = bal*interest;
        bal -= (monthly - thisMonthsInterest); //остаток от погашения по кредиту
        g.lineTo(paymentToX(p), amountToY(bal)); // линию до этой точки
    }
    g.lineWidth = 3;//жирная линия
    g.stroke(); //нарисовать кривую графика
    g.fillStyle = "black"; //цвет текста
    g.fillText("Остаток ссуды", 20,50);

    //нарисовать отметки лет на оси Х
    g.textAlign = "center"; //текст меток по центру
    var y = amountToY(0); //координата Y на оси X
    for(var year = 1; year*12 <= payments; year++) {
        var x = paymentToX(year*12); //вычислить позицию метки
        g.fillRect(x-0.5, y-3, 1, 3); //нарисовать метку
        if (year == 1) g.fillText("Year", x, y-5); //подписать ось
        if (year % 5 == 0 && year*12 !== payments) //числа через каждые 5 лет
            g.fillText(String(year), x, y-5);
    }

    //суммы платежей у правой границы
    g.textAlign = "right";
    g.textBaseline = "middle";
    var ticks = [monthly*payments, principal]; //вывести две суммы
    var rightEdge = paymentToX(payments); //координата х по оси у
    for(var i = 0; i < ticks.length; i++) {
        //для каждой из двух сумм определить координату у
        var y = amountToY(ticks[i]); //определить координату у
        g.fillRect(rightEdge-3, y-0.5, 3, 1);//нарисовать метку
        g.fillText(String(ticks[i].toFixed(0)), rightEdge-5, y);//и вывести рядом сумму
    }
}