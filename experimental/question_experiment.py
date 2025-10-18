from dotenv import load_dotenv
from openai import OpenAI
import os

load_dotenv()

prompt = """
Below, we have a lecture that is being delivered to a student and a hypothesis of what we believe we know about the student.

<lecture>
Alright — to make sense of wireless sensor networks we often use a simple reference model, shown here on the left of the slide. At the top is the application layer where your sensing and control code lives. Below that is the network layer which handles multi‑hop routing across many small nodes. Below that is the data link layer, responsible for medium access and making reliable point‑to‑point links. And at the bottom is the physical layer — modulation and frequency selection — which is what actually turns bits into radio waves and back again. The pictures on the right illustrate the difference between a multi‑hop network (the little graph with many nodes and the route from A to B) and a plain point‑to‑point link (the two nodes with arrows). The phone and the waveforms remind us that the physical layer is about carriers and signals.

Let’s unpack why the physical layer matters so much for the layers above. The physical layer decides which carrier frequency we use, how we modulate the carrier (how we encode bits as changes in amplitude, frequency, or phase), and what bandwidth and power are available. Those choices determine the basic properties of a wireless link: how far it can reach, how fast data can be sent, how susceptible it is to noise and interference, and how much energy the radio consumes. In a sensor network those properties drive routing and medium access: a route that looks short in hop count can be useless if the underlying radio link is weak or very noisy.

A quick, intuitive view of modulation: imagine the radio carrier is a continuous sine wave. We can change that wave’s amplitude, its frequency, or its phase in step with the data we want to send. Simple schemes (think on/off keying or binary frequency-shift keying) are cheap and energy‑efficient but carry less data per second. More complex schemes (like phase‑shift keying or OFDM) pack more bits into each symbol but require more precise electronics and more energy. Standards for sensor motes typically choose low‑power, robust modulations — for example, IEEE 802.15.4 at 2.4 GHz uses a direct‑sequence spread spectrum with offset QPSK to balance data rate and robustness.

Frequency selection is equally important. Choosing a lower frequency generally gives better propagation through foliage and walls and a longer range, but available bandwidth is smaller and antennas are larger. Higher frequencies provide more bandwidth (so higher data rates) but suffer higher path loss and are more sensitive to obstacles. Regulations also matter: sensor systems often use unlicensed ISM bands (like 2.4 GHz or sub‑GHz bands) where there can be heavy interference from Wi‑Fi, Bluetooth, or other devices, which the MAC and physical design must tolerate.

Moving one layer up, the data link layer must arbitrate who transmits and when. If the physical layer is noisy or the signal strength varies a lot, the MAC needs to detect collisions, retransmit, or schedule transmissions to avoid interference. Sensor MACs often trade off latency for energy by duty‑cycling radios: nodes sleep most of the time and wake briefly to transmit or listen. Those sleep schedules and the reliability of a single hop directly affect routing: a routing protocol can prefer links that are higher quality or more stable, even if they require more hops, because the overall packet delivery probability and energy cost are better.

Because the physical layer affects link quality, network designers use link metrics that reflect the real radio behavior. Instead of just counting hops, routing protocols can use metrics like ETX (expected number of transmissions), RSSI (received signal strength indication), or LQI (link quality indicator) so that the network layer chooses paths that will actually deliver packets efficiently across the physical medium shown in the diagram.

So when you look at that reference model picture, think of the physical layer as the foundation that shapes everything above it. The waveforms and the handset image are reminders that radio physics — propagation, noise, interference, and modulation — constrain what we can achieve with MAC scheduling, multi‑hop routing, and the application logic that ultimately uses the sensed data.
</lecture>

<hypothesis>
The student has a strong understanding of the application and network layer, but has little understanding about the physical layer.
</hypothesis>

Ask the student a question about the content discussed in the later parts of the lecture that will help provide insight into their level of understanding. Make the question have a short written response. Only ask the question, nothing else.
"""

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

slide_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "Slide2.pdf"))

response = client.responses.create(
    model="gpt-5-mini",
    input=prompt,
)

print(response.output_text)
