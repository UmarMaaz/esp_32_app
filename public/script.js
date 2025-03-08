const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "en-US";
recognition.continuous = true;
recognition.interimResults = false;

const statusElement = document.getElementById("status");
const responseElement = document.getElementById("response");
const capturedImage = document.getElementById("captured-image");

let isImageCaptured = false;

recognition.start();

recognition.onresult = (event) => {
    const command = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
    statusElement.innerText = `Command received: "${command}"`;

    if (command.toLowerCase().replace('.', '').trim() === "capture image") {
        statusElement.innerText = "Capturing image...";
        fetch("/capture")
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    capturedImage.src = `/uploads/captured_image.jpg?t=${new Date().getTime()}`; // Force refresh
                    capturedImage.style.display = "block";
                    statusElement.innerText = "Image captured. Now give your prompt to process the image...";
                    isImageCaptured = true;
                } else {
                    statusElement.innerText = data.error;
                }
            })
            .catch(error => {
                statusElement.innerText = `Error: ${error.message}`;
            });
    } 
    else if (command.toLowerCase().replace('.', '').trim() === "reset image") {
        statusElement.innerText = "Resetting...";
        isImageCaptured = false;
        capturedImage.style.display = "none";
        responseElement.innerText = "";
    } 
    else if (isImageCaptured) {
        statusElement.innerText = `Processing: "${command}"`;

        fetch("/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: command })
        })
        .then(response => response.json())
        .then(data => {
            let aiResponse = data.response || data.error;
            responseElement.innerText = `Response: ${aiResponse}`;

            recognition.stop();

            const speech = new SpeechSynthesisUtterance(aiResponse);
            speech.lang = "ur-PK";
            window.speechSynthesis.speak(speech);

            speech.onend = () => {
                recognition.start();
            };
        });
    }
};

recognition.onerror = (event) => {
    statusElement.innerText = `Error: ${event.error}`;
    recognition.start();
};
