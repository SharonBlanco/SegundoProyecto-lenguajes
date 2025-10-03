# SegundoProyecto-lenguajes
Objetivos
    • Aprender/Ampliar conocimientos principalmente sobre un lenguaje de programación con características del paradigma funcional.
    • Aplicar conceptos de diseño de aplicaciones utilizando las características principales del paradigma, vistas en clase.
    • Generar una herramienta que canalice los conceptos a interiorizar en este proyecto de forma retadora.

Descripción del proyecto

El problema consiste en implementar un sistema que permita generar y resolver los juegos “ahorcado” y “sopa de letras” en idioma español.

Deberá cumplir con los siguientes requisitos para cada juego:

Ahorcado:
    1. Deberá contar con la opción de jugar a partir de una lista de palabras establecida que pueda cambiarse para lograr realizar diferentes pruebas (mediante archivo de texto)
    2. El usuario podrá ir escribiendo letras que le permitirán ir mostrando las coincidencias en la palabra a adivinar de manera que al final pueda ser encontrada.
    3. Se contará con una cantidad de intentos máxima, luego de las cuales, el usuario perderá el juego.
    4. Deberá mostrar el tiempo final en que se encontró la palabra.
    5. El resto de detalles internos dependerán del diseño propio de cada estudiante.

Sopa de letras:
    1. Deberá poder generar la matriz de sopa de letras a partir de una lista de palabras dadas en idioma español en una cuadrícula suficientemente grande para albergar hasta la palabra de mayor cantidad de letras que permita el sistema. El sistema deberá leer las palabras de un archivo de texto de manera que si se altera el archivo de texto, esto afecte el desempeño del juego. Este generador de sopas de letras deberá ser resuelto utilizando técnicas/algoritmos eficientes de programación funcional. Es posible utilizar generadores de terceros siempre que se documente adecuadamente su origen y fuente. 
    2. El usuario podrá resolver la sopa de letras marcando la palabra que considera que encontró y de una forma suficientemente intuitiva en la interfaz y el sistema deberá indicarle, en caso de estar en lo correcto, que lo está y marcar dicha palabra como encontrada, o en su defecto, indicar el fallo.
    3. El sistema será capaz de encontrar todas las soluciones de forma automática (independientemente de si el usuario ha encontrado ya o no todas las palabras). Debe hacerse una diferenciación en la interfaz respecto de aquellas palabras que ya han sido identificadas por el usuario y las que se hacen en la búsqueda de soluciones automática

Deberá cumplir estrictamente con los siguientes requisitos propios de programación funcional y los detalles puntuales deben ser justificados apropiadamente en la documentación:

    1. Para el desarrollo de la sopa de letras en la parte de solución automática, se debe hacer uso de la estrategia de búsqueda en profundidad vista en clase utilizando las mismas funciones vecinos, extender y profundidad y la misma lógica de funcionamiento. En este sentido será clave la sobre todo la planificación y el uso de la función vecinos. Se recuerda que las funciones vistas en clase hacen uso funciones de orden superior como map y filter
    2. Se debe programar dichos juegos evitando side-efects (toda función depende solamente de sus argumentos de entrada, siempre que se corra con los mismos argumentos, siempre devolverá el mismo resultado – determinismo total y las estructuras utilizadas son inmutables)

El sistema debe jugarse por medio de una interfaz gráfica realizada en el lenguaje que deseen (puede ser el mismo F#) pero la implementación de la solución logística de ambos juegos debe realizarse en F# de forma estricta.
