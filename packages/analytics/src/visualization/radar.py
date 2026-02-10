import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from io import BytesIO

def generate_radar_chart(current: dict, preferred: dict = None) -> bytes:
    cats = list(current.keys())
    n = len(cats)
    angles = np.linspace(0, 2*np.pi, n, endpoint=False).tolist() + [0]
    fig, ax = plt.subplots(figsize=(6,6), subplot_kw=dict(polar=True))
    vals = list(current.values()) + [list(current.values())[0]]
    ax.plot(angles, vals, 'o-', lw=2, color='#2E86AB', label='Mevcut')
    ax.fill(angles, vals, alpha=0.15, color='#2E86AB')
    if preferred:
        pvals = list(preferred.values()) + [list(preferred.values())[0]]
        ax.plot(angles, pvals, 'o-', lw=2, color='#E8A838', label='Tercih')
        ax.fill(angles, pvals, alpha=0.1, color='#E8A838')
    ax.set_xticks(angles[:-1]); ax.set_xticklabels(cats); ax.legend()
    buf = BytesIO(); fig.savefig(buf, format='png', dpi=150, bbox_inches='tight'); plt.close(fig)
    return buf.getvalue()
