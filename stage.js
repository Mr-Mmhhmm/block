$(document).ready(function () {
    OpenLP.connect();
});

window.OpenLP = {
    visible: false,
    mode: "lyrics",
    modes: { lyrics: "lyrics", title: "title", footer: "footer" },
    websocket_port: 4317,

    connect: function () {
        let params = (new URL(document.location)).searchParams;
        OpenLP.mode = params.get("mode");
        if (!OpenLP.mode) {
            OpenLP.mode = OpenLP.modes.lyrics;
        }
        if (OpenLP.mode == OpenLP.modes.lyrics) {
            OpenLP.show_images = params.has("show_images");
        }

        if (params.has("show_types")) {
            OpenLP.show_types = params.get("show_types").split(",");
        }
        else {
            OpenLP.show_types = ["songs", "bibles"];
        }

        const host = window.location.hostname;
        ws = new WebSocket(`ws://${host}:${OpenLP.websocket_port}`);
        ws.onmessage = (event) => {
            const reader = new FileReader();
            reader.onload = () => {
                data = JSON.parse(reader.result.toString()).results;
                if (data.blank || data.theme || data.display) {
                    OpenLP.visible = false;
                    OpenLP.update();
                }
                else if (OpenLP.currentItem != data.item || OpenLP.currentService != data.service || OpenLP.visible == false) {
                    OpenLP.visible = true;
                    OpenLP.currentItem = data.item;
                    OpenLP.currentService = data.service;
                    OpenLP.load();
                }
                else if (OpenLP.currentSlide != data.slide) {
                    OpenLP.visible = true;
                    if (OpenLP.mode == OpenLP.modes.lyrics) {
                        OpenLP.currentSlide = parseInt(data.slide, 10);
                        OpenLP.update();
                    }
                }
            };

            reader.readAsText(event.data);
        };
    },

    load: function () {
        fetch('/api/v2/controller/live-items?_=' + Date.now())
            .then(function (response) {
                return response.json();
            })
            .then(function (data) {
                switch (OpenLP.mode) {
                    case OpenLP.modes.lyrics:
                        OpenLP.currentSlides = data.slides;
                        OpenLP.currentSlide = -1;
                        if (OpenLP.currentSlides && OpenLP.show_types.includes(data.name)) {
                            OpenLP.currentSlides.forEach(function (slide, idx) {
                                if (slide["selected"])
                                    OpenLP.currentSlide = idx;
                            });
                        }
                        break;
                    case OpenLP.modes.title:
                        OpenLP.currentTitle = (OpenLP.show_types.includes(data.name) ? data.title : "");
                        break;
                    case OpenLP.modes.footer:
                        OpenLP.currentFooter = (OpenLP.show_types.includes(data.name) ? data.footer : []);
                        break;
                }
                OpenLP.update();
            });
    },

    update: function () {
        var $content = null;
        if (OpenLP.visible == true) {
            switch (OpenLP.mode) {
                case OpenLP.modes.lyrics:
                    if (OpenLP.currentSlide > -1) {
                        if (OpenLP.currentSlides[OpenLP.currentSlide].img) {
                            if (OpenLP.show_images) {
                                $content = $("<section />").append(
                                    $("<div />").append(
                                        $("<img/>", { src: OpenLP.currentSlides[OpenLP.currentSlide].img })
                                    )
                                );
                            }
                        } else {
                            var $content = $("<section />").css({ display: "none" }).fadeIn({ queue: false, duration: 1000 });
                            var $div = $('<div />');
                            $content.append($div);
                            let lines = OpenLP.currentSlides[OpenLP.currentSlide].text.split("\n");
                            lines.forEach(function (line, idx) {
                                $div.append(
                                    $('<p />').text(line)
                                );
                            });
                        }
                    }
                    break;
                case OpenLP.modes.title:
                    $content = $("<h1/>").text(OpenLP.currentTitle).css({ display: "none" }).fadeIn({ queue: false, duration: 1000 });
                    break;
                case OpenLP.modes.footer:
                    var $content = $('<footer />').css({ display: "none" }).fadeIn({ queue: false, duration:1000 });
                    OpenLP.currentFooter.forEach(function (line, idx) {
                        $content.append(
                            $('<p />').text(line)
                        );
                    });
                    break;
            }
        }

        
        var $old = $("body > section, body > footer, body > h1")
        if ($old.length) {
            $old.fadeOut({
                queue: true,
                always: function () {
                    $(this).remove();
                }
            });
		}
		if ($content) {
			$("html body").append($content);
		}
	}
}