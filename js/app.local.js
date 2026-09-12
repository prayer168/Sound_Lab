(() => {
  // js/sound-description.mjs
  function spectrumFeatures(decibels, samples, sampleRate, fftSize) {
    const binHz = sampleRate / fftSize;
    const first = Math.max(1, Math.ceil(60 / binHz));
    const last = Math.min(decibels.length - 1, Math.floor(16e3 / binHz));
    let total = 0, low = 0, mid = 0, high = 0, logSum = 0, peak = first;
    const powers = [];
    for (let i = first; i <= last; i++) {
      const power = Number.isFinite(decibels[i]) ? 10 ** (decibels[i] / 10) : 0;
      powers[i] = power;
      total += power;
      logSum += Math.log(Math.max(power, 1e-20));
      if (power > (powers[peak] || 0)) peak = i;
      if (i * binHz < 300) low += power;
      else if (i * binHz < 2e3) mid += power;
      else high += power;
    }
    let sumSquares = 0, overRange = 0;
    for (const value of samples) {
      sumSquares += value * value;
      if (Math.abs(value) >= 0.99) overRange++;
    }
    const count = Math.max(1, last - first + 1);
    let peakPower = 0;
    for (let i = Math.max(first, peak - 2); i <= Math.min(last, peak + 2); i++) peakPower += powers[i];
    return {
      rms: Math.sqrt(sumSquares / Math.max(1, samples.length)),
      overRange: overRange / Math.max(1, samples.length),
      total,
      low: total ? low / total : 0,
      mid: total ? mid / total : 0,
      high: total ? high / total : 0,
      concentration: total ? peakPower / total : 0,
      flatness: total ? Math.exp(logSum / count) / (total / count) : 0
    };
  }
  function describeSound(history) {
    const current = history.at(-1);
    if (!current || current.rms < 8e-3 || current.total < 1e-12) {
      return { text: "\u76EE\u524D\u8072\u97F3\u592A\u5FAE\u5F31\u6216\u6C92\u6709\u660E\u986F\u8A0A\u865F\uFF0C\u9084\u7121\u6CD5\u53EF\u9760\u63CF\u8FF0\u97F3\u8CEA\u8207\u97F3\u8272\u3002\u8A66\u8457\u9760\u8FD1\u9EA5\u514B\u98A8\u8AAA\u8A71\u6216\u767C\u51FA\u8072\u97F3\u3002", evidence: "", state: "\u8A0A\u865F\u5FAE\u5F31" };
    }
    const frames = history.filter((frame) => frame.rms >= 8e-3 && frame.total >= 1e-12);
    const mean = (key) => frames.reduce((sum, frame) => sum + frame[key], 0) / frames.length;
    const low = mean("low"), mid = mean("mid"), high = mean("high");
    const color = low > 0.55 ? "\u97F3\u8272\u504F\u4F4E\u6C89\u3001\u539A\u5BE6\uFF0C\u4F4E\u983B\u6210\u5206\u8F03\u7A81\u51FA\u3002" : high > 0.5 ? "\u97F3\u8272\u504F\u660E\u4EAE\u3001\u5C16\u7D30\uFF0C\u9AD8\u983B\u6210\u5206\u8F03\u7A81\u51FA\u3002" : mid > 0.6 ? "\u97F3\u8272\u4EE5\u4E2D\u983B\u70BA\u4E3B\uFF0C\u807D\u611F\u8F03\u5C45\u4E2D\u3002" : "\u97F3\u8272\u6DF7\u5408\u4E86\u4F4E\u3001\u4E2D\u3001\u9AD8\u983B\u6210\u5206\uFF0C\u517C\u6709\u539A\u5EA6\u8207\u660E\u4EAE\u611F\u3002";
    const texture = mean("flatness") > 0.18 ? "\u983B\u8B5C\u5206\u5E03\u8F03\u5EE3\u4E14\u5206\u6563\uFF0C\u53EF\u80FD\u5E36\u6709\u6C99\u6C99\u6216\u5636\u5636\u7684\u96DC\u8A0A\u611F\u3002" : mean("concentration") > 0.72 ? "\u80FD\u91CF\u96C6\u4E2D\u5728\u4E00\u500B\u7A84\u983B\u5E36\uFF0C\u8072\u97F3\u8F03\u55AE\u7D14\uFF0C\u63A5\u8FD1\u7D14\u97F3\u7684\u807D\u611F\u3002" : "\u80FD\u91CF\u5206\u5E03\u5728\u591A\u500B\u983B\u7387\uFF0C\u8072\u97F3\u6210\u5206\u8F03\u8C50\u5BCC\uFF0C\u53EF\u80FD\u5E36\u6709\u8F03\u8907\u96DC\u7684\u97F3\u8272\u3002";
    const levels = history.map((frame) => 20 * Math.log10(Math.max(frame.rms, 1e-6)));
    const movement = history.length < 3 ? "\u6B63\u5728\u89C0\u5BDF\u97F3\u91CF\u7684\u8B8A\u5316\u3002" : Math.max(...levels) - Math.min(...levels) > 9 ? "\u6700\u8FD1\u7684\u97F3\u91CF\u8D77\u4F0F\u660E\u986F\uFF0C\u8072\u97F3\u6709\u5F37\u5F31\u8B8A\u5316\u3002" : "\u6700\u8FD1\u7684\u97F3\u91CF\u8F03\u5E73\u7A69\u3002";
    const warning = current.overRange > 0.02 ? "\u76EE\u524D\u8A0A\u865F\u8D85\u51FA\u5716\u8868\u7BC4\u570D\uFF0C\u8ACB\u964D\u4F4E\u9748\u654F\u5EA6\u5F8C\u518D\u89C0\u5BDF\u97F3\u8CEA\u3002" : "";
    const evidence = `\u983B\u8B5C\u7DDA\u7D22\uFF1A\u4F4E\u983B ${Math.round(low * 100)}% \xB7 \u4E2D\u983B ${Math.round(mid * 100)}% \xB7 \u9AD8\u983B ${Math.round(high * 100)}%\uFF0860\u2013300\uFF0F300\u20132,000\uFF0F2,000\u201316,000 Hz\uFF09`;
    return { text: `${color}${texture}${movement}${warning}`, evidence, state: "\u5373\u6642\u89C0\u5BDF" };
  }

  // data/content.json
  var content_default = {
    concepts: [
      {
        title: "\u983B\u7387\u6C7A\u5B9A\u97F3\u9AD8",
        text: "\u983B\u7387\u662F\u6BCF\u79D2\u632F\u52D5\u7684\u6B21\u6578\uFF0C\u55AE\u4F4D\u662F Hz\u3002\u983B\u7387\u8D8A\u9AD8\uFF0C\u901A\u5E38\u807D\u8D77\u4F86\u8D8A\u5C16\uFF1B\u983B\u7387\u8D8A\u4F4E\uFF0C\u901A\u5E38\u807D\u8D77\u4F86\u8D8A\u6C89\u3002",
        visual: "frequency"
      },
      {
        title: "\u632F\u5E45\u5F71\u97FF\u97F3\u91CF",
        text: "\u632F\u5E45\u4EE3\u8868\u632F\u52D5\u5E45\u5EA6\u3002\u6CE2\u5F62\u4E0A\u4E0B\u64FA\u52D5\u8D8A\u5927\uFF0C\u8072\u97F3\u901A\u5E38\u8D8A\u5927\uFF1B\u7DB2\u7AD9\u7528\u4F30\u8A08 dB \u8B93\u4F60\u89C0\u5BDF\u97F3\u91CF\u8B8A\u5316\u3002",
        visual: "amplitude"
      },
      {
        title: "\u983B\u8B5C\u50CF\u8072\u97F3\u6307\u7D0B",
        text: "\u4E0D\u540C\u8072\u97F3\u901A\u5E38\u5305\u542B\u8A31\u591A\u983B\u7387\u3002\u983B\u8B5C\u5716\u628A\u5404\u983B\u7387\u80FD\u91CF\u6392\u6210\u67F1\u72C0\uFF0C\u5E6B\u52A9\u6211\u5011\u770B\u51FA\u8072\u97F3\u7684\u7279\u8272\u3002",
        visual: "spectrum"
      }
    ],
    applications: [
      {
        title: "\u8ABF\u97F3\u8207\u6A19\u6E96\u97F3",
        text: "\u6A02\u5668\u5E38\u7528 440 Hz \u7684 A \u97F3\u7576\u4F5C\u8ABF\u97F3\u53C3\u8003\u3002\u7528\u983B\u7387\u7522\u751F\u5668\u53EF\u4EE5\u807D\u898B\u9019\u500B\u6A19\u6E96\u97F3\u3002",
        visual: "tuning"
      },
      {
        title: "\u566A\u97F3\u76E3\u6E2C",
        text: "\u5206\u8C9D\u53EF\u4EE5\u5354\u52A9\u5224\u65B7\u74B0\u5883\u662F\u5426\u592A\u5435\u3002\u9577\u6642\u9593\u66B4\u9732\u5728\u9AD8\u97F3\u91CF\u74B0\u5883\uFF0C\u53EF\u80FD\u5F71\u97FF\u807D\u529B\u5065\u5EB7\u3002",
        visual: "noise"
      },
      {
        title: "\u8A9E\u97F3\u8FA8\u8B58",
        text: "\u8A9E\u97F3\u7CFB\u7D71\u6703\u5206\u6790\u983B\u7387\u3001\u80FD\u91CF\u548C\u6642\u9593\u8B8A\u5316\uFF0C\u627E\u51FA\u4E0D\u540C\u5B57\u97F3\u7684\u7DDA\u7D22\u3002",
        visual: "speech"
      },
      {
        title: "\u97F3\u6A02\u8996\u89BA\u5316",
        text: "\u821E\u53F0\u71C8\u5149\u6216\u64AD\u653E\u5668\u52D5\u756B\u5E38\u628A\u4F4E\u983B\u7BC0\u594F\u3001\u9AD8\u983B\u4EAE\u5EA6\u8F49\u63DB\u6210\u52D5\u614B\u756B\u9762\u3002",
        visual: "visualizer"
      },
      {
        title: "\u8D85\u97F3\u6CE2\u61C9\u7528",
        text: "\u4EBA\u8033\u901A\u5E38\u807D\u4E0D\u5230 20000 Hz \u4EE5\u4E0A\uFF0C\u4F46\u8D85\u97F3\u6CE2\u53EF\u7528\u65BC\u6E2C\u8DDD\u3001\u6E05\u6D17\u6216\u91AB\u5B78\u5F71\u50CF\u3002",
        visual: "ultrasound"
      },
      {
        title: "\u9694\u97F3\u8A2D\u8A08",
        text: "\u4E0D\u540C\u6750\u6599\u6703\u5438\u6536\u6216\u53CD\u5C04\u4E0D\u540C\u983B\u7387\u3002\u89C0\u5BDF\u983B\u8B5C\u80FD\u5E6B\u52A9\u601D\u8003\u9694\u97F3\u8207\u5438\u97F3\u8A2D\u8A08\u3002",
        visual: "insulation"
      }
    ]
  };

  // data/quiz.json
  var quiz_default = [
    {
      question: "\u5982\u679C\u983B\u7387\u5F9E 220 Hz \u8ABF\u5230 880 Hz\uFF0C\u6700\u660E\u986F\u7684\u611F\u53D7\u901A\u5E38\u662F\u4EC0\u9EBC\uFF1F",
      options: ["\u97F3\u9AD8\u8B8A\u9AD8", "\u8072\u97F3\u4E00\u5B9A\u8B8A\u5C0F", "\u8072\u97F3\u4E00\u5B9A\u6D88\u5931", "\u5206\u8C9D\u4E00\u5B9A\u6B78\u96F6"],
      answer: 0,
      explanation: "\u983B\u7387\u8D8A\u9AD8\uFF0C\u901A\u5E38\u807D\u8D77\u4F86\u97F3\u9AD8\u8D8A\u9AD8\uFF1B\u97F3\u91CF\u4E3B\u8981\u548C\u632F\u5E45\u6709\u95DC\u3002"
    },
    {
      question: "\u5728\u9EA5\u514B\u98A8\u983B\u8B5C\u5716\u4E2D\uFF0C\u6700\u9AD8\u7684\u67F1\u5B50\u6700\u63A5\u8FD1\u4EE3\u8868\u4EC0\u9EBC\uFF1F",
      options: ["\u80FD\u91CF\u6700\u5F37\u7684\u983B\u7387\u5340\u57DF", "\u8072\u97F3\u64AD\u653E\u6642\u9593", "\u87A2\u5E55\u4EAE\u5EA6", "\u7DB2\u8DEF\u901F\u5EA6"],
      answer: 0,
      explanation: "\u983B\u8B5C\u67F1\u72C0\u5716\u986F\u793A\u5404\u983B\u7387\u7684\u80FD\u91CF\u5927\u5C0F\u3002"
    },
    {
      question: "\u70BA\u4EC0\u9EBC\u8D85\u904E 18000 Hz \u7684\u8072\u97F3\u6709\u6642\u807D\u4E0D\u5230\uFF1F",
      options: ["\u53EF\u80FD\u8D85\u51FA\u807D\u529B\u6216\u5587\u53ED\u53EF\u64AD\u653E\u7BC4\u570D", "\u56E0\u70BA\u5B83\u4E0D\u662F\u8072\u97F3", "\u56E0\u70BA\u5206\u8C9D\u6C38\u9060\u662F 0", "\u56E0\u70BA\u700F\u89BD\u5668\u4E0D\u80FD\u756B\u5716"],
      answer: 0,
      explanation: "\u9AD8\u983B\u53EF\u80FD\u53D7\u5230\u4EBA\u8033\u3001\u5587\u53ED\u8207\u8A2D\u5099\u9650\u5236\u3002"
    },
    {
      question: "\u60F3\u8B93\u8072\u97F3\u8B8A\u5C0F\uFF0C\u6700\u76F4\u63A5\u53EF\u8ABF\u6574\u54EA\u500B\u56E0\u7D20\uFF1F",
      options: ["\u632F\u5E45\u6216\u97F3\u91CF", "\u7DB2\u9801\u6A19\u984C", "\u983B\u8B5C\u984F\u8272", "\u9801\u7C64\u9806\u5E8F"],
      answer: 0,
      explanation: "\u632F\u5E45\u8D8A\u5C0F\uFF0C\u8072\u97F3\u80FD\u91CF\u901A\u5E38\u8D8A\u4F4E\uFF0C\u807D\u8D77\u4F86\u4E5F\u8F03\u5C0F\u3002"
    },
    {
      question: "\u97F3\u6A02\u8996\u89BA\u5316\u5E38\u628A\u4F4E\u983B\u9F13\u8072\u8F49\u63DB\u6210\u54EA\u4E00\u7A2E\u756B\u9762\u8B8A\u5316\uFF1F",
      options: ["\u7BC0\u594F\u6027\u7684\u653E\u5927\u6216\u8DF3\u52D5", "\u5B8C\u5168\u975C\u6B62", "\u53EA\u6709\u6587\u5B57\u8B8A\u591A", "\u7DB2\u9801\u91CD\u65B0\u6574\u7406"],
      answer: 0,
      explanation: "\u4F4E\u983B\u80FD\u91CF\u5E38\u548C\u7BC0\u594F\u611F\u6709\u95DC\uFF0C\u53EF\u7528\u4F86\u9A45\u52D5\u756B\u9762\u8DF3\u52D5\u3002"
    },
    {
      question: "\u5169\u500B\u8072\u97F3\u983B\u7387\u76F8\u540C\uFF0C\u4F46\u5176\u4E2D\u4E00\u500B\u632F\u5E45\u8F03\u5927\uFF0C\u6700\u53EF\u80FD\u7684\u5DEE\u5225\u662F\u4EC0\u9EBC\uFF1F",
      options: ["\u97F3\u91CF\u8F03\u5927", "\u97F3\u9AD8\u8F03\u9AD8", "\u50B3\u5F97\u8F03\u5FEB", "\u984F\u8272\u8F03\u4EAE"],
      answer: 0,
      explanation: "\u983B\u7387\u76F8\u540C\u4EE3\u8868\u97F3\u9AD8\u76F8\u8FD1\uFF1B\u632F\u5E45\u8F03\u5927\u4EE3\u8868\u632F\u52D5\u5E45\u5EA6\u5927\uFF0C\u97F3\u91CF\u8F03\u5927\u3002"
    },
    {
      question: "\u4E0B\u5217\u54EA\u4E00\u500B\u7684\u55AE\u4F4D\u662F\u300CHz\uFF08\u8D6B\u8332\uFF09\u300D\uFF1F",
      options: ["\u983B\u7387", "\u97F3\u91CF", "\u6EAB\u5EA6", "\u9577\u5EA6"],
      answer: 0,
      explanation: "Hz \u662F\u983B\u7387\u7684\u55AE\u4F4D\uFF0C\u4EE3\u8868\u6BCF\u79D2\u632F\u52D5\u7684\u6B21\u6578\u3002"
    },
    {
      question: "\u4E00\u822C\u983B\u8B5C\u5716\u4E2D\uFF0C\u6A6B\u8EF8\u7684\u67F1\u5B50\u7531\u5DE6\u5230\u53F3\u901A\u5E38\u4EE3\u8868\u4EC0\u9EBC\u9806\u5E8F\uFF1F",
      options: ["\u983B\u7387\u7531\u4F4E\u5230\u9AD8", "\u6642\u9593\u7531\u65E9\u5230\u665A", "\u97F3\u91CF\u7531\u5C0F\u5230\u5927", "\u984F\u8272\u7531\u6DF1\u5230\u6DFA"],
      answer: 0,
      explanation: "\u983B\u8B5C\u5716\u7684\u6A6B\u8EF8\u901A\u5E38\u662F\u983B\u7387\uFF0C\u5DE6\u908A\u4F4E\u983B\u3001\u53F3\u908A\u9AD8\u983B\u3002"
    },
    {
      question: "\u9577\u6642\u9593\u5F85\u5728\u5F88\u5927\u8072\u7684\u74B0\u5883\uFF0C\u6700\u9700\u8981\u6CE8\u610F\u4EC0\u9EBC\uFF1F",
      options: ["\u4FDD\u8B77\u807D\u529B\uFF0C\u9069\u5EA6\u964D\u4F4E\u97F3\u91CF\u6216\u914D\u6234\u9632\u8B77", "\u76E1\u91CF\u9760\u8FD1\u5587\u53ED", "\u628A\u983B\u7387\u8ABF\u5230\u6700\u9AD8", "\u628A\u87A2\u5E55\u95DC\u6389"],
      answer: 0,
      explanation: "\u9AD8\u97F3\u91CF\u9577\u671F\u66B4\u9732\u53EF\u80FD\u50B7\u5BB3\u807D\u529B\uFF0C\u8981\u9069\u5EA6\u964D\u4F4E\u97F3\u91CF\u6216\u505A\u597D\u807D\u529B\u4FDD\u8B77\u3002"
    },
    {
      question: "\u8072\u97F3\u662F\u4E00\u7A2E\u6CE2\u52D5\uFF0C\u9700\u8981\u900F\u904E\u4E0B\u5217\u4F55\u8005\u624D\u80FD\u50B3\u905E\uFF1F",
      options: ["\u4ECB\u8CEA\uFF08\u4F8B\u5982\u7A7A\u6C23\u3001\u6C34\uFF09", "\u5B8C\u5168\u771F\u7A7A", "\u5149\u7DDA", "\u96FB\u6C60"],
      answer: 0,
      explanation: "\u8072\u97F3\u662F\u6A5F\u68B0\u6CE2\uFF0C\u9700\u8981\u4ECB\u8CEA\u50B3\u905E\uFF1B\u5728\u771F\u7A7A\u4E2D\u7121\u6CD5\u50B3\u64AD\u8072\u97F3\u3002"
    }
  ];

  // data/resources.json
  var resources_default = [
    {
      title: "PhET \u8072\u97F3\u6A21\u64EC",
      url: "https://phet.colorado.edu/zh_TW/simulations/sound",
      type: "\u4E92\u52D5\u6A21\u64EC",
      grade: "\u570B\u5C0F\u9AD8\u5E74\u7D1A\u5230\u570B\u4E2D",
      description: "\u7528\u6A21\u64EC\u89C0\u5BDF\u8072\u6CE2\u3001\u983B\u7387\u8207\u632F\u5E45\u3002",
      checkedAt: "2026-06-21"
    },
    {
      title: "\u6559\u80B2\u767E\u79D1\uFF1A\u8072\u97F3",
      url: "https://pedia.cloud.edu.tw/",
      type: "\u77E5\u8B58\u67E5\u8A62",
      grade: "\u570B\u5C0F\u5230\u570B\u4E2D",
      description: "\u67E5\u8A62\u8072\u97F3\u3001\u983B\u7387\u3001\u5206\u8C9D\u7B49\u540D\u8A5E\u89E3\u91CB\u3002",
      checkedAt: "2026-06-21"
    },
    {
      title: "\u4E2D\u592E\u6C23\u8C61\u7F72\u5730\u9707\u8072\u6CE2\u5EF6\u4F38\u95B1\u8B80",
      url: "https://www.cwa.gov.tw/",
      type: "\u751F\u6D3B\u79D1\u5B78",
      grade: "\u570B\u4E2D",
      description: "\u8A8D\u8B58\u6CE2\u52D5\u5728\u4E0D\u540C\u60C5\u5883\u4E2D\u7684\u61C9\u7528\uFF0C\u53EF\u5EF6\u4F38\u6BD4\u8F03\u6A5F\u68B0\u6CE2\u6982\u5FF5\u3002",
      checkedAt: "2026-06-21"
    },
    {
      title: "\u7F8E\u570B CDC \u566A\u97F3\u8207\u807D\u529B",
      url: "https://www.cdc.gov/niosh/noise/",
      type: "\u5065\u5EB7\u6559\u80B2",
      grade: "\u570B\u4E2D",
      description: "\u4E86\u89E3\u9AD8\u97F3\u91CF\u74B0\u5883\u8207\u807D\u529B\u4FDD\u8B77\u3002",
      checkedAt: "2026-06-21"
    },
    {
      title: "Mozilla Web Audio API",
      url: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API",
      type: "\u6280\u8853\u6587\u4EF6",
      grade: "\u6559\u5E2B\u8207\u9032\u968E\u5B78\u751F",
      description: "\u4E86\u89E3\u700F\u89BD\u5668\u5982\u4F55\u7522\u751F\u8207\u5206\u6790\u8072\u97F3\u3002",
      checkedAt: "2026-06-21"
    },
    {
      title: "Science Learning Hub: Sound",
      url: "https://www.sciencelearn.org.nz/resources/47-sound",
      type: "\u79D1\u5B78\u95B1\u8B80",
      grade: "\u570B\u4E2D",
      description: "\u4EE5\u751F\u6D3B\u4F8B\u5B50\u8A8D\u8B58\u8072\u97F3\u8207\u6CE2\u52D5\u3002",
      checkedAt: "2026-06-21"
    }
  ];

  // data/bio-manifest.json
  var bio_manifest_default = {
    dog: {
      file: "dog.ogg",
      src: "File:Barking of a dog.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/a/a2/Barking_of_a_dog.ogg",
      size: 82638,
      artist: "Amada44",
      license: "CC BY-SA 3.0",
      credit: "Own work",
      name: "\u72D7",
      group: "\u54FA\u4E73\u985E",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Barking_of_a_dog.ogg",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/"
    },
    cat: {
      file: "cat.ogg",
      src: "File:Meow.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/6/62/Meow.ogg",
      size: 14306,
      artist: "The original uploader was Dcrosby at English Wikipedia.",
      license: "CC BY-SA 3.0",
      credit: "Transferred from en.wikipedia to Commons by FSII using CommonsHelper.",
      name: "\u8C93",
      group: "\u54FA\u4E73\u985E",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Meow.ogg",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/"
    },
    frog: {
      file: "frog.oga",
      src: "File:Single Frog Croak.oga",
      url: "https://upload.wikimedia.org/wikipedia/commons/9/9f/Single_Frog_Croak.oga",
      size: 83798,
      artist: "MichaeltheFox8621",
      license: "CC BY-SA 4.0",
      credit: "Own work",
      name: "\u9752\u86D9",
      group: "\u5169\u68F2\u985E",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Single_Frog_Croak.oga",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/"
    },
    cricket: {
      file: "cricket.oga",
      src: "File:Cricket Gryllus bimaculatus Chirps.oga",
      url: "https://upload.wikimedia.org/wikipedia/commons/5/5d/Cricket_Gryllus_bimaculatus_Chirps.oga",
      size: 427425,
      artist: "Rickjpelleg",
      license: "CC BY-SA 4.0",
      credit: "Own work",
      name: "\u87CB\u87C0",
      group: "\u6606\u87F2",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Cricket_Gryllus_bimaculatus_Chirps.oga",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/"
    },
    bee: {
      file: "bee.opus",
      src: "File:Bee buzzing sound (animal noises).opus",
      url: "https://upload.wikimedia.org/wikipedia/commons/0/0f/Bee_buzzing_sound_%28animal_noises%29.opus",
      size: 315606,
      artist: "Free Sounds Library User Spanac",
      license: "CC BY 3.0",
      credit: "YouTube: Bee Noise | Free Sound Effects | Animal Sounds \u2013 View/save archived versions on archive.org",
      name: "\u871C\u8702",
      group: "\u6606\u87F2",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Bee_buzzing_sound_(animal_noises).opus",
      licenseUrl: "https://creativecommons.org/licenses/by/3.0/"
    },
    owl: {
      file: "owl.wav",
      src: "File:Maghreb owl hooting.wav",
      url: "https://upload.wikimedia.org/wikipedia/commons/9/94/Maghreb_owl_hooting.wav",
      size: 1441870,
      artist: "\u0639\u062B\u0645\u0627\u0646",
      license: "CC BY-SA 4.0",
      credit: "Own work",
      name: "\u8C93\u982D\u9DF9",
      group: "\u9CE5\u985E",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Maghreb_owl_hooting.wav",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/"
    },
    whale: {
      file: "whale.oga",
      src: "File:Humpback-Whale-Song-and-Foraging-Behavior-on-an-Antarctic-Feeding-Ground-pone.0051214.s001.oga",
      url: "https://upload.wikimedia.org/wikipedia/commons/1/12/Humpback-Whale-Song-and-Foraging-Behavior-on-an-Antarctic-Feeding-Ground-pone.0051214.s001.oga",
      size: 463592,
      artist: "Stimpert A, Peavey L, Friedlaender A, Nowacek D",
      license: "CC BY 2.5",
      credit: 'Acoustic File S1 from Stimpert A, Peavey L, Friedlaender A, Nowacek D (2012). "Humpback Whale Song and Foraging Behavior on an Antarctic Feeding Ground". PLOS ONE. DOI:10.1371/journal.pone.0051214. PMID 23284666. PMC: 3526533.',
      name: "\u9BE8\u9B5A",
      group: "\u6D77\u6D0B\u54FA\u4E73\u985E",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Humpback-Whale-Song-and-Foraging-Behavior-on-an-Antarctic-Feeding-Ground-pone.0051214.s001.oga",
      licenseUrl: "https://creativecommons.org/licenses/by/2.5/"
    },
    rooster: {
      file: "rooster.ogg",
      src: "File:Rooster crowing.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/c/c5/Rooster_crowing.ogg",
      size: 39876,
      artist: "Filo g\xE8n'",
      license: "CC BY-SA 4.0",
      credit: "Own work",
      name: "\u516C\u96DE",
      group: "\u9CE5\u985E",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Rooster_crowing.ogg",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/"
    },
    dolphin: {
      file: "dolphin.wav",
      src: "File:161691 felixblume dolphin-screaming-underwater-in-caribbean-sea-mexico.wav",
      url: "https://upload.wikimedia.org/wikipedia/commons/5/5a/161691_felixblume_dolphin-screaming-underwater-in-caribbean-sea-mexico.wav",
      size: 6331372,
      artist: "The user Felix.Blume\n\nhttps://freesound.org/people/felix.blume/",
      license: "CC0",
      credit: "Freesound\n\nhttps://freesound.org/people/felix.blume/sounds/161691/",
      name: "\u6D77\u8C5A",
      group: "\u6D77\u6D0B\u54FA\u4E73\u985E",
      sourcePage: "https://commons.wikimedia.org/wiki/File:161691_felixblume_dolphin-screaming-underwater-in-caribbean-sea-mexico.wav",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/"
    },
    cow: {
      file: "cow.ogg",
      src: "File:Single Cow Moo.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Single_Cow_Moo.ogg",
      size: 53861,
      artist: "MichaeltheFox8621",
      license: "CC BY-SA 4.0",
      credit: "Own work",
      name: "\u725B",
      group: "\u54FA\u4E73\u985E",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Single_Cow_Moo.ogg",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/"
    },
    sheep: {
      file: "sheep.ogg",
      src: "File:Sheep bleating.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/1/13/Sheep_bleating.ogg",
      size: 159655,
      artist: "earthcalling",
      license: "Public domain",
      credit: "Clipped from File:Corner_of_a_sheep_field_in_summer.ogg, originally from http://www.pdsounds.org/audio/download/341/sheepfield.mp3\n\nPDSounds description: http://www.pdsounds.org/sounds/corner_of_a_sheep_field_in_summer\nTransferred by F\xE6, clipped by Dcoetzee",
      name: "\u7F8A",
      group: "\u54FA\u4E73\u985E",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Sheep_bleating.ogg",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/"
    },
    horse: {
      file: "horse.ogg",
      src: "File:Wiehern.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/d/db/Wiehern.ogg",
      size: 17541,
      artist: "H\xFC.",
      license: "Public domain",
      credit: "Own work",
      name: "\u99AC",
      group: "\u54FA\u4E73\u985E",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Wiehern.ogg",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/"
    },
    elephant: {
      file: "elephant.ogg",
      src: "File:Elephant voice - trumpeting.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/4/40/Elephant_voice_-_trumpeting.ogg",
      size: 18502,
      artist: "\u0BA4\u0B95\u0BB5\u0BB2\u0BC1\u0BB4\u0BB5\u0BA9\u0BCD",
      license: "CC0",
      credit: "Own work",
      name: "\u5927\u8C61",
      group: "\u54FA\u4E73\u985E",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Elephant_voice_-_trumpeting.ogg",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/"
    },
    wolf: {
      file: "wolf.ogg",
      src: "File:Wolf howls.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/8/87/Wolf_howls.ogg",
      size: 371644,
      artist: "",
      license: "Public domain",
      credit: "",
      name: "\u72FC",
      group: "\u54FA\u4E73\u985E",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Wolf_howls.ogg",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/"
    },
    crow: {
      file: "crow.ogg",
      src: "File:Carrion Crow (Corvus corone) (W1CDR0001425 BD18).ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/8/8a/Carrion_Crow_%28Corvus_corone%29_%28W1CDR0001425_BD18%29.ogg",
      size: 704542,
      artist: "",
      license: "CC BY-SA 4.0",
      credit: "This file has been provided by the British Library from its digital collections. Links to the British Library's website may be broken as the library recovers from a October 2023 cyber attack, and will be updated once material becomes accessible online. For more information on the attack see: https://www.bl.uk/about/cyber-attack It is also made available on a British Library website.",
      name: "\u70CF\u9D09",
      group: "\u9CE5\u985E",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Carrion_Crow_(Corvus_corone)_(W1CDR0001425_BD18).ogg",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/"
    },
    duck: {
      file: "duck.ogg",
      src: "File:Anas platyrhynchos - Mallard - XC62258.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Anas_platyrhynchos_-_Mallard_-_XC62258.ogg",
      size: 53498,
      artist: "Jonathon Jongsma",
      license: "CC BY-SA 3.0",
      credit: "http://www.xeno-canto.org/62258",
      name: "\u9D28\u5B50",
      group: "\u9CE5\u985E",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Anas_platyrhynchos_-_Mallard_-_XC62258.ogg",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/"
    },
    cicada: {
      file: "cicada.ogg",
      src: "File:Florida Cicada Song.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/c/c3/Florida_Cicada_Song.ogg",
      size: 1454775,
      artist: "Gatorguy76",
      license: "CC BY 3.0",
      credit: "Own work by up-loader",
      name: "\u87EC",
      group: "\u6606\u87F2",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Florida_Cicada_Song.ogg",
      licenseUrl: "https://creativecommons.org/licenses/by/3.0/"
    },
    pig: {
      file: "pig.ogg",
      src: "File:Pig grunt - Erdie.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/a/ac/Pig_grunt_-_Erdie.ogg",
      size: 12702,
      artist: "erdie",
      license: "CC BY 3.0",
      credit: "This media file comes from Freesound.org, a collection of Creative Commons licensed audio samples.\nFor more information, please see their official website www.freesound.org",
      name: "\u8C6C",
      group: "\u54FA\u4E73\u985E",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Pig_grunt_-_Erdie.ogg",
      licenseUrl: "https://creativecommons.org/licenses/by/3.0/"
    },
    goat: {
      file: "goat.ogg",
      src: "File:Herd of goats bleating.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Herd_of_goats_bleating.ogg",
      size: 1271223,
      artist: "stephan",
      license: "Public domain",
      credit: "http://www.pdsounds.org/audio/download/161/ziegengatter.mp3\n\nPDSounds description: http://www.pdsounds.org/sounds/herd_of_goats_bleating\nTransferred by F\xE6",
      name: "\u5C71\u7F8A",
      group: "\u54FA\u4E73\u985E",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Herd_of_goats_bleating.ogg",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/"
    },
    monkey: {
      file: "monkey.ogg",
      src: "File:Mantled Howler Monkey (Alouatta palliata) (W ALOUATTA PALLIATA R1 C2).ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/8/81/Mantled_Howler_Monkey_%28Alouatta_palliata%29_%28W_ALOUATTA_PALLIATA_R1_C2%29.ogg",
      size: 962590,
      artist: "",
      license: "CC BY 4.0",
      credit: "This file has been provided by the British Library from its digital collections. Links to the British Library's website may be broken as the library recovers from a October 2023 cyber attack, and will be updated once material becomes accessible online. For more information on the attack see: https://www.bl.uk/about/cyber-attack It is also made available on a British Library website.",
      name: "\u7334\u5B50",
      group: "\u54FA\u4E73\u985E",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Mantled_Howler_Monkey_(Alouatta_palliata)_(W_ALOUATTA_PALLIATA_R1_C2).ogg",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/"
    },
    snake: {
      file: "snake.ogg",
      src: "Google Sound Library: animal_hiss_and_rattle",
      url: "https://actions.google.com/sounds/v1/animals/animal_hiss_and_rattle.ogg",
      size: 130404,
      artist: "Google",
      license: "Google Sound Library (free to use)",
      credit: "Google Sound Library: animal_hiss_and_rattle",
      name: "\u86C7",
      group: "\u722C\u87F2\u985E"
    },
    mosquito: {
      file: "mosquito.ogg",
      src: "Google Sound Library: buzzing_fly",
      url: "https://actions.google.com/sounds/v1/animals/buzzing_fly.ogg",
      size: 8865,
      artist: "Google",
      license: "Google Sound Library (free to use)",
      credit: "Google Sound Library: buzzing_fly",
      name: "\u84BC\u8805",
      group: "\u6606\u87F2",
      correction: "2026-09-11\uFF1A\u4F9D\u539F\u59CB\u4F86\u6E90 buzzing_fly\uFF0C\u5C07\u986F\u793A\u540D\u7A31\u7531\u868A\u5B50\u6821\u6B63\u70BA\u84BC\u8805\uFF1B\u4FDD\u7559\u65E2\u6709\u97F3\u6A94\u8207\u8B58\u5225\u78BC\u3002"
    },
    lion: {
      file: "lion.mp3",
      name: "\u7345\u5B50",
      group: "\u54FA\u4E73\u985E",
      src: "File:Lion raring-sound1TamilNadu178.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/7/7d/Lion_raring-sound1TamilNadu178.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Lion_raring-sound1TamilNadu178.ogg",
      size: 81128,
      artist: "\u0BA4*\u0B89\u0BB4\u0BB5\u0BA9\u0BCD",
      license: "Public domain",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
      credit: "Own work",
      description: "the roaring of a lion in captivity   \u0BA4\u0BAE\u0BBF\u0BB4\u0BCD:    \u0BB5\u0BBF\u0BB2\u0B99\u0BCD\u0B95\u0BBF\u0BAF\u0BB2\u0BCD \u0BAA\u0BC2\u0B99\u0BCD\u0B95\u0BBE\u0BB5\u0BBF\u0BB2\u0BC1\u0BB3\u0BCD\u0BB3, \u0B86\u0BA3\u0BCD \u0B9A\u0BBF\u0B99\u0BCD\u0B95\u0BA4\u0BCD\u0BA4\u0BBF\u0BA9\u0BCD \u0B95\u0BC1\u0BB0\u0BB2\u0BCD.\u0B92\u0BB2\u0BBF \u0B9A\u0BC0\u0BB0\u0BAE\u0BC8\u0BAA\u0BCD\u0BAA\u0BC1\u0B9A\u0BCD \u0B9A\u0BC6\u0BAF\u0BCD\u0BAF\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1.",
      sourceSha1: "c55bb80d33f85619731893a16c9dfea51a6a54d9",
      sha256: "b4426d9c11d6be0430638205972f6f5c99ad5ebbc6ba4bbe7241627100c0c08c",
      clipStart: 0.75,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 0.75\u20135.75 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    tiger: {
      file: "tiger.mp3",
      name: "\u8001\u864E",
      group: "\u54FA\u4E73\u985E",
      src: "File:439280 schots angry-tiger.wav",
      url: "https://upload.wikimedia.org/wikipedia/commons/2/29/439280_schots_angry-tiger.wav?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:439280_schots_angry-tiger.wav",
      size: 81128,
      artist: "schots",
      license: "CC0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      credit: "https://freesound.org/people/schots/sounds/439280/",
      description: "Tiger in a cage, growling and snarling. Lots of reverb",
      sourceSha1: "d23e3cd7a0a8348c88313cd9f252eaff1740fea2",
      sha256: "5df4314d732ff353a5a5f20267f475d1c69b64bab2f6498a42472476636416fa",
      clipStart: 23.25,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 23.25\u201328.25 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    cheetah: {
      file: "cheetah.mp3",
      name: "\u7375\u8C79",
      group: "\u54FA\u4E73\u985E",
      src: "File:Acoustic-Structure-and-Contextual-Use-of-Calls-by-Captive-Male-and-Female-Cheetahs-(Acinonyx-pone.0158546.s001.oga",
      url: "https://upload.wikimedia.org/wikipedia/commons/c/ca/Acoustic-Structure-and-Contextual-Use-of-Calls-by-Captive-Male-and-Female-Cheetahs-%28Acinonyx-pone.0158546.s001.oga?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Acoustic-Structure-and-Contextual-Use-of-Calls-by-Captive-Male-and-Female-Cheetahs-(Acinonyx-pone.0158546.s001.oga",
      size: 81128,
      artist: "Smirnova D, Volodin I, Demina T, Volodina E",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0",
      credit: 'S1 Audio  from  Smirnova D, Volodin I, Demina T, Volodina E (2016). " Acoustic Structure and Contextual Use of Calls by Captive Male and Female Cheetahs (Acinonyx jubatus) ".  PLOS ONE .   DOI  : 10.1371/journal.pone.0158546 .    PMID     27362643 .    PMC   :  4928801 .',
      description: "Calls of adult cheetahs. Purr, hiss, growl, chirr, meow, chirp, howl.",
      sourceSha1: "09a6d08663816bb2c4f06fdca645fa508554f7ff",
      sha256: "cb0e30162ea4f7870cbb837ca4cbd27373579a7149c2ea50f026db7eca918eb1",
      clipStart: 18.5,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 18.50\u201323.50 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    hyena: {
      file: "hyena.mp3",
      name: "\u6591\u9B23\u72D7",
      group: "\u54FA\u4E73\u985E",
      src: "File:Spotted Hyena Grunting (Crocuta crocuta).ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/9/9f/Spotted_Hyena_Grunting_%28Crocuta_crocuta%29.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Spotted_Hyena_Grunting_(Crocuta_crocuta).ogg",
      size: 81128,
      artist: "Tom Snyder",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
      credit: "Own work",
      description: "This is the grunting vocalization in a female hyena found at the Florida International Teaching Zoo (recorded at night on 3/12/12) thezooschool.com",
      sourceSha1: "8d22a354339dd9ea997bda1a6a6fe9b8f49f8c14",
      sha256: "3a3378a36092a43391dc8912a949861b35dae0f59019d4b3f2311043180e3f55",
      clipStart: 0.5,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 0.50\u20135.50 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    fox: {
      file: "fox.mp3",
      name: "\u8D64\u72D0",
      group: "\u54FA\u4E73\u985E",
      src: "File:Bellender Fuchs.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Bellender_Fuchs.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Bellender_Fuchs.ogg",
      size: 81128,
      artist: "Jugr\xFC",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
      credit: "Own work",
      description: "Rotfuchs (  Vulpes vulpes  ) bellt.",
      sourceSha1: "842dc23cfd103290f50dbf0855c42c11f50f7b62",
      sha256: "67ca2572154eb0f4c8b6943ce6c4dcc5c631ffe8bec4bfe519666d7245ddd7e0",
      clipStart: 4,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 4.00\u20139.00 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    coyote: {
      file: "coyote.mp3",
      name: "\u90CA\u72FC",
      group: "\u54FA\u4E73\u985E",
      src: "File:Pack of coyotes howling.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/6/67/Pack_of_coyotes_howling.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Pack_of_coyotes_howling.ogg",
      size: 81128,
      artist: "Rybkovich",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      credit: "Own work",
      description: "Pack of coyotes howling at night. Recorded on June 9th, 2021. In Ventura County, Southern California - part of the California montane chaparral and woodlands habitat.",
      sourceSha1: "630a57e926c5b0c7ba18ee764db26a35df244a52",
      sha256: "84e62f904366cb21d613e47fdbe52eef63bfe6efdea844f4050f958ace67151b",
      clipStart: 6,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 6.00\u201311.00 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    donkey: {
      file: "donkey.mp3",
      name: "\u9A62",
      group: "\u54FA\u4E73\u985E",
      src: "File:157763 felix-blume a-donkey-is-braying-in-his-enclosure-in-south-of-france.wav",
      url: "https://upload.wikimedia.org/wikipedia/commons/2/25/157763_felix-blume_a-donkey-is-braying-in-his-enclosure-in-south-of-france.wav?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:157763_felix-blume_a-donkey-is-braying-in-his-enclosure-in-south-of-france.wav",
      size: 81256,
      artist: "felix-blume",
      license: "CC0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      credit: "http://freesound.org/people/felix.blume/sounds/157763/",
      description: "A donkey is braying in his enclosure, in south of France (Minvervois, my homeland).\n Balthazar (my donkey) is braying when I'm arriving.\n  Sound recorded by a MS setup Schoeps Microphone CCM41&CCM8;\nSound Devices 744T\nMS is encoded in STEREO Left-Right\nrecorded in 2012\n \nSound Ref: @CAL120513T01",
      sourceSha1: "461888e511dacaaa2c6345d5cd57995323cb26fe",
      sha256: "9d41fecd58f4e0a04b9c1eb199ffb6ad50b361dd8ead2a9c4349a60425ec01a6",
      clipStart: 3.5,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 3.50\u20138.50 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    red_deer: {
      file: "red_deer.mp3",
      name: "\u8D64\u9E7F",
      group: "\u54FA\u4E73\u985E",
      src: "File:Hirsch roehrt.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/9/95/Hirsch_roehrt.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Hirsch_roehrt.ogg",
      size: 81128,
      artist: "Jugr\xFC",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
      credit: "Own work",
      description: "Hirsch (  Cervus elaphus  ) r\xF6hrt.",
      sourceSha1: "f6b274d9cef2650fba0065828eafc9b17b398301",
      sha256: "1136ee86a7e7df4d351057f70b75ebe3ec06f1dc973a660c3bad0d200c89f364",
      clipStart: 1.75,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 1.75\u20136.75 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    elk: {
      file: "elk.mp3",
      name: "\u52A0\u62FF\u5927\u99AC\u9E7F",
      group: "\u54FA\u4E73\u985E",
      src: "File:American Elk Bugling.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/8/88/American_Elk_Bugling.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:American_Elk_Bugling.ogg",
      size: 81128,
      artist: "Jim Pisarowicz",
      license: "Public domain",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
      credit: "http://www.nps.gov/wica/Elk.htm",
      description: "American Elk Bugling Cervus elephus",
      sourceSha1: "0f195ad5b63e97fa5b36f09d9053bd4cb9c5a656",
      sha256: "5f954e0e3404bd37147c87e630b7b6dada0087b4af37f34b5545b2d40dd4119c",
      clipStart: 0,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 0.00\u20135.00 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    marmot: {
      file: "marmot.mp3",
      name: "\u65F1\u737A",
      group: "\u54FA\u4E73\u985E",
      src: "File:Alpine marmot call.wav",
      url: "https://upload.wikimedia.org/wikipedia/commons/e/e4/Alpine_marmot_call.wav?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Alpine_marmot_call.wav",
      size: 81128,
      artist: "TanguyLo\xEFs",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      credit: "Own work",
      description: "Alarm call of an Alpine marmot. Savoie, French Alps.",
      sourceSha1: "4596b041acc1fefc1a5eb8715723c3d95f7e5851",
      sha256: "bbc3830658f2f1370fddd6b67704925a523f86200bf09e82fc765ec32bdfc4a9",
      clipStart: 10,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 10.00\u201315.00 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    guinea_pig: {
      file: "guinea_pig.mp3",
      name: "\u5929\u7AFA\u9F20",
      group: "\u54FA\u4E73\u985E",
      src: "File:Guinea Pig Defense Sound.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/6/61/Guinea_Pig_Defense_Sound.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Guinea_Pig_Defense_Sound.ogg",
      size: 81128,
      artist: "Guineapigmanual",
      license: "CC BY 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by/3.0",
      credit: "Recorded with Tape-a-Talk Android app. \n \n Previously published:   http://www.guineapigmanual.com/guinea-pig-sounds/",
      description: "This is one of the guinea pig sounds described on the Guinea Pig Wikipedia page. Its original location is on the www.GuineaPigManual.com website.",
      sourceSha1: "6c9cfe5156b97f86cc93e6b0d9f81e07ba8e3ffc",
      sha256: "f7d51091d4c2fe31196bdb1c4ecb1db6c2352e7baa516292f9e0714fd8ba1f58",
      clipStart: 0,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 0.00\u20135.00 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    grizzly: {
      file: "grizzly.mp3",
      name: "\u68D5\u718A\uFF08\u7070\u718A\uFF09",
      group: "\u54FA\u4E73\u985E",
      src: "File:Yellowstone sound library - Grizzly Bears Roar - 001.mp3",
      url: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Yellowstone_sound_library_-_Grizzly_Bears_Roar_-_001.mp3?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Yellowstone_sound_library_-_Grizzly_Bears_Roar_-_001.mp3",
      size: 86335,
      artist: "NPS & MSU Acoustic Atlas / Jennifer Jerrett",
      license: "Public domain",
      licenseUrl: "https://creativecommons.org/publicdomain/mark/1.0/",
      credit: "https://www.nps.gov/yell/learn/photosmultimedia/grizzlysounds.htm",
      description: "Two grizzly bears feed on a bison carcass, pausing to roar at each other.",
      sourceSha1: "edcc1cc1c2b976c8e014764925e5448940ed79d7",
      sha256: "587e342b700a8abf230402b4c9e7cdc8c694390465efc89ca334b30ab9c2ca9c",
      clipStart: 1.25,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 1.25\u20136.25 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    penguin: {
      file: "penguin.mp3",
      name: "\u570B\u738B\u4F01\u9D5D",
      group: "\u9CE5\u985E",
      src: "File:King Penguin Rookery Audio.oga",
      url: "https://upload.wikimedia.org/wikipedia/commons/9/97/King_Penguin_Rookery_Audio.oga?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:King_Penguin_Rookery_Audio.oga",
      size: 80710,
      artist: "Hullwarren",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
      credit: "Own work",
      description: "This audio was recorded at the Lusitania Bay King Penguin Rookery on Macquarie Island",
      sourceSha1: "3d22a1ef5dffb12c1fc0bf039c25b4f21b65d0dd",
      sha256: "3469873c6477dd95d81dd67bd547534899ff536accf1ed84d5b9e487dedfabd9",
      clipStart: 24.5,
      duration: 4.989,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 24.50\u201329.49 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    peacock: {
      file: "peacock.mp3",
      name: "\u5B54\u96C0",
      group: "\u9CE5\u985E",
      src: "File:MalePeacockCall.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/0/0f/MalePeacockCall.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:MalePeacockCall.ogg",
      size: 81128,
      artist: "Perlscrypt",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
      credit: "Own work",
      description: "The call of a male peacock. Usually used to establish territory or as an alert when danger is spotted.",
      sourceSha1: "a134a2e9fdc68539916fba268ba41802134d23bd",
      sha256: "227f9420be1d0731dd0245946a6d148ff6be8cd62ab54fec22a75443f8196791",
      clipStart: 0.5,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 0.50\u20135.50 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    turkey: {
      file: "turkey.mp3",
      name: "\u706B\u96DE",
      group: "\u9CE5\u985E",
      src: "File:Meleagris gallopavo - Wild Turkey XC136045.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Meleagris_gallopavo_-_Wild_Turkey_XC136045.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Meleagris_gallopavo_-_Wild_Turkey_XC136045.ogg",
      size: 81128,
      artist: "Jonathon Jongsma",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
      credit: "Metadata:   http://xeno-canto.org/136045  \n  Audio file:   http://www.xeno-canto.org/download.php?XC=136045",
      description: "A male calling from a walking path in deciduous woodland less than 10m away.  The aspirated 'click' that often follows the  gobble  were also made by the turkey. \n bird-seen:yes \n playback-used:no \n  Common name:  Wild Turkey \n  Type:  male, song \n  Genus:  Meleagris \n  Species:  gallopavo \n  Location:  Hyland Lake Park Reserve, Hennepin, MN \n  Elevation:  260 m",
      sourceSha1: "47a08fcdcb8705873bbd841ea3392f2d1fc1ec1d",
      sha256: "4b283c3f4584187100723a1b1a9f64940a691784c2d0edea54932383c52faeb6",
      clipStart: 54.75,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 54.75\u201359.75 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    goose: {
      file: "goose.mp3",
      name: "\u7070\u96C1",
      group: "\u9CE5\u985E",
      src: "File:Greylag Goose (Anser anser) - B\xE6rum, Norway 2021-04-03.mp3",
      url: "https://upload.wikimedia.org/wikipedia/commons/0/0e/Greylag_Goose_%28Anser_anser%29_-_B%C3%A6rum%2C_Norway_2021-04-03.mp3?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Greylag_Goose_(Anser_anser)_-_B%C3%A6rum,_Norway_2021-04-03.mp3",
      size: 81128,
      artist: "Ryan Hodnett",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      credit: "Own work",
      description: "Greylag Goose ( Anser anser ) in B\xE6rum, Norway.",
      sourceSha1: "e39b681805caa90a32e26f36d0e15cd093ff6b67",
      sha256: "e72dbaf7148d15a443db07be45e24c81a90f66783f0bb6bbd57032612514d8f3",
      clipStart: 5.25,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 5.25\u201310.25 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    pigeon: {
      file: "pigeon.mp3",
      name: "\u539F\u9D3F",
      group: "\u9CE5\u985E",
      src: "File:Columba livia - Rock Dove XC539061.mp3",
      url: "https://upload.wikimedia.org/wikipedia/commons/1/1a/Columba_livia_-_Rock_Dove_XC539061.mp3?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Columba_livia_-_Rock_Dove_XC539061.mp3",
      size: 81709,
      artist: "Marie-Lan Ta\xFF Pamart",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      credit: "Metadata:  https://www.xeno-canto.org/539061  \n Audio file:  https://www.xeno-canto.org/539061/download",
      description: ":Pedro the friendly feral pigeon waiting for their daily handful of seeds.\n  Background sounds: plic-ploc sounds from a nearby water point \n Distance: <50cm \n Equipment: Olympus LS-12 (internal mics) \n bird-seen:yes \n playback-used:no \n  Common name:  Rock Dove \n  Type:  adult, call, sex uncertain \n  Genus:  Columba \n  Species:  livia \n  Location:  Paris, Arrondissement de Paris, \xCEle-de-France \n  Country:  France \n  Elevation:  50 m",
      sourceSha1: "8f5304db955b6fb26eecd6589ba6154220a347d2",
      sha256: "58385c95aab1b7135419014a0ea45353f6e8d93edc53440ed1d024d115e371c4",
      clipStart: 11.75,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 11.75\u201316.75 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    woodpecker: {
      file: "woodpecker.mp3",
      name: "\u5927\u6591\u5544\u6728\u9CE5",
      group: "\u9CE5\u985E",
      src: "File:Dendrocopos major - Great Spotted Woodpecker XC460852.mp3",
      url: "https://upload.wikimedia.org/wikipedia/commons/a/a7/Dendrocopos_major_-_Great_Spotted_Woodpecker_XC460852.mp3?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Dendrocopos_major_-_Great_Spotted_Woodpecker_XC460852.mp3",
      size: 81524,
      artist: "Hannu Varkki",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      credit: "Metadata:  https://www.xeno-canto.org/460852  \n Audio file:  https://www.xeno-canto.org/460852/download",
      description: ":bird-seen:yes\n  playback-used:no \n  Common name:  Great Spotted Woodpecker \n  Type:  begging call \n  Genus:  Dendrocopos \n  Species:  major \n  Location:  Mustavuori, Helsinki, Uusimaa \n  Country:  Finland \n  Elevation:  10 m",
      sourceSha1: "a5d0a3b6379ca80f8fc4c3cc7022ce325d07fa63",
      sha256: "a71c5d86e5164191271b0448ca4306e50d469169e670b9adbd4933437ef2b4f8",
      clipStart: 6.5,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 6.50\u201311.50 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    cuckoo: {
      file: "cuckoo.mp3",
      name: "\u5927\u675C\u9D51",
      group: "\u9CE5\u985E",
      src: "File:Cuculus canorus - Common Cuckoo XC457076.mp3",
      url: "https://upload.wikimedia.org/wikipedia/commons/9/98/Cuculus_canorus_-_Common_Cuckoo_XC457076.mp3?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Cuculus_canorus_-_Common_Cuckoo_XC457076.mp3",
      size: 81493,
      artist: "Hannu Varkki",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      credit: "Metadata:  https://www.xeno-canto.org/457076  \n Audio file:  https://www.xeno-canto.org/457076/download",
      description: ":bird-seen:no\n  playback-used:no \n  Common name:  Common Cuckoo \n  Type:  song \n  Genus:  Cuculus \n  Species:  canorus \n  Location:  Helsinki, Helsinki, Uusimaa \n  Country:  Finland \n  Elevation:  20 m",
      sourceSha1: "14e457c0b113ca6ea265fab432a398326205ae0a",
      sha256: "cfa946434d23c21260697b9fb686dbd18d83b41682ba03856aeeac93de5a108f",
      clipStart: 9.75,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 9.75\u201314.75 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    kingfisher: {
      file: "kingfisher.mp3",
      name: "\u666E\u901A\u7FE0\u9CE5",
      group: "\u9CE5\u985E",
      src: "File:Common kingfisher call recorded in December 2015 at Anjarle, Ratnagiri.wav",
      url: "https://upload.wikimedia.org/wikipedia/commons/d/dd/Common_kingfisher_call_recorded_in_December_2015_at_Anjarle%2C_Ratnagiri.wav?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Common_kingfisher_call_recorded_in_December_2015_at_Anjarle,_Ratnagiri.wav",
      size: 37917,
      artist: "Sharadapte",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      credit: "Own work",
      description: "Common kingfisher call recorded in December 2015 at Anjarle, Ratnagiri",
      sourceSha1: "b621856aa2aaf1a85310401c283d450f3a510a97",
      sha256: "fd54dc6e32d87a965481c8e1606b61766b9e5f838ff2ba9f2db515c7a549490d",
      clipStart: 0,
      duration: 2.291,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 0.00\u20132.29 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    hoopoe: {
      file: "hoopoe.mp3",
      name: "\u6234\u52DD",
      group: "\u9CE5\u985E",
      src: "File:Upupa epops.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/c/cf/Upupa_epops.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Upupa_epops.ogg",
      size: 79456,
      artist: "Vladimir Yu. Arkhipov, Arkhivov",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
      credit: "Own work",
      description: "Call of Hoopoe, Astrakhan Oblast, Russia",
      sourceSha1: "bdd574451a8285d925b096c2fb09afca99593c44",
      sha256: "289d103d898cd0bcab4c6223bad704e0e8115aa41f9426ebb523d850bb599550",
      clipStart: 2.25,
      duration: 4.909,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 2.25\u20137.16 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    nightingale: {
      file: "nightingale.mp3",
      name: "\u591C\u9DAF",
      group: "\u9CE5\u985E",
      src: "File:Luscinia megarhynchos - Common Nightingale XC473316.mp3",
      url: "https://upload.wikimedia.org/wikipedia/commons/f/ff/Luscinia_megarhynchos_-_Common_Nightingale_XC473316.mp3?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Luscinia_megarhynchos_-_Common_Nightingale_XC473316.mp3",
      size: 81756,
      artist: "Marie-Lan Ta\xFF Pamart",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      credit: "Metadata:  https://www.xeno-canto.org/473316  \n Audio file:  https://www.xeno-canto.org/473316/download",
      description: ":Unseen bird singing very loudly from a hedgerow to another one about 30m away.\n  Habitat: dense undergrowth, river nearby. \n Distance: <3m \n Edits: -12dB high-pass filter at 900Hz \n Equipment: Sennheiser ME66/K6, Rycote Windjammer, Tascam DR-05 \n bird-seen:no \n playback-used:no \n  Common name:  Common Nightingale \n  Type:  call, song \n  Genus:  Luscinia \n  Species:  megarhynchos \n  Location:  Lagorce, Ard\xE8che, Auvergne-Rh\xF4ne-Alpes \n  Country:  France \n  Elevation:  280 m",
      sourceSha1: "49a5cefcc0b9ab8039124ec8f7bffa08246b0dc5",
      sha256: "bd4cddfbbac386ea0d9cb0729762aa6a4493ab6d0f1feb7ede90fde45b38738d",
      clipStart: 9.75,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 9.75\u201314.75 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    blackbird: {
      file: "blackbird.mp3",
      name: "\u70CF\u9D87",
      group: "\u9CE5\u985E",
      src: "File:Turdus merula - Common Blackbird XC442745.mp3",
      url: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Turdus_merula_-_Common_Blackbird_XC442745.mp3?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Turdus_merula_-_Common_Blackbird_XC442745.mp3",
      size: 82038,
      artist: "James Ray",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      credit: "Metadata:  https://www.xeno-canto.org/442745  \n Audio file:  https://www.xeno-canto.org/442745/download",
      description: ":Recorded on a deck at the back of the house at the provided coordinates, about 5-10 m above ground. This is typical dry sclerophyll forest on a ridge with eucalypts and casuarinas dominating the canopy, in different areas. There are intermittent creeks (more like ponds along the creekline as of Nov 2018) at the valley bottoms east and west about 200 m away.\n  My recording device is a smart phone, a Xiaomi Redmi Note 4X. Recorded to wav with Wave Editor and converted to mp3. Normalized in ocenaudio. \n bird-seen:no \n playback-used:no \n  Common name:  Common Blackbird \n  Type:  call, flight call, male, song \n  Genus:  Turdus \n  Species:  merula \n  Location:  Faulconbridge, Blue Mountains City Council, New South Wales \n  Country:  Australia \n  Elevation:  480 m",
      sourceSha1: "07ca461bbd691de88301efce067c67eff55aca7c",
      sha256: "c13ad898ca9affdf440e7409c1c6a4e0b6719b4d80f0749edd0c5672152d3f7d",
      clipStart: 0,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 0.00\u20135.00 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    starling: {
      file: "starling.mp3",
      name: "\u6B50\u6D32\u690B\u9CE5",
      group: "\u9CE5\u985E",
      src: "File:Sturnus vulgaris - Common Starling XC474427.mp3",
      url: "https://upload.wikimedia.org/wikipedia/commons/b/b9/Sturnus_vulgaris_-_Common_Starling_XC474427.mp3?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Sturnus_vulgaris_-_Common_Starling_XC474427.mp3",
      size: 81794,
      artist: "Marie-Lan Ta\xFF Pamart",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      credit: "Metadata:  https://www.xeno-canto.org/474427  \n Audio file:  https://www.xeno-canto.org/474427/download",
      description: ":Bird singing softly from a tree in front of its nest, while opening and closing its wings rhythmically. Sunny day, fresh breeze.\n  Distance: ~5m \n Edits: -12dB high-pass filter at 1700Hz, +5dB amplification \n Equipment: Sennheiser ME66/K6, Rycote Windjammer, Tascam DR-05 \n bird-seen:yes \n playback-used:no \n  Common name:  Common Starling \n  Type:  song, wing flaps \n  Genus:  Sturnus \n  Species:  vulgaris \n  Location:  Pasli\xE8res, Puy-de-D\xF4me, Auvergne-Rh\xF4ne-Alpes \n  Country:  France \n  Elevation:  400 m",
      sourceSha1: "02475e9ca7992b6c8895cac0a7056f69c6b2ce40",
      sha256: "79f0ce9f0b4c4d83eeef709f354491d8629e33b3e47e57ec76c11023d67dfff9",
      clipStart: 21,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 21.00\u201326.00 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    magpie: {
      file: "magpie.mp3",
      name: "\u559C\u9D72",
      group: "\u9CE5\u985E",
      src: "File:Pica pica - Eurasian Magpie XC537413.mp3",
      url: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Pica_pica_-_Eurasian_Magpie_XC537413.mp3?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Pica_pica_-_Eurasian_Magpie_XC537413.mp3",
      size: 81480,
      artist: "Beno\xEEt Van Hecke",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      credit: "Metadata:  https://www.xeno-canto.org/537413  \n Audio file:  https://www.xeno-canto.org/537413/download",
      description: ":DIY parabolic mic (2 x mics EM 172) + Zoom F1\n   Common name:  Eurasian Magpie \n  Type:  adult, call \n  Genus:  Pica \n  Species:  pica \n  Location:  Fontaine-le-Comte, Vienne, Nouvelle-Aquitaine \n  Country:  France \n  Elevation:  140 m",
      sourceSha1: "66183cd7dba44ae3aece43fcd4d3c0aa2d55b4ef",
      sha256: "410d2d70c7230f261782431f69a87f9bd6cd59ed796ed19586098240cace3022",
      clipStart: 23.25,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 23.25\u201328.25 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    sparrow: {
      file: "sparrow.mp3",
      name: "\u9EBB\u96C0",
      group: "\u9CE5\u985E",
      src: "File:Passer montanus.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/8/83/Passer_montanus.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Passer_montanus.ogg",
      size: 81128,
      artist: "Vladimir Yu. Arkhipov, Arkhivov",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
      credit: "Own work",
      description: "Calls of several tree sparrows, Moscow region, Russia",
      sourceSha1: "567d1d15730a6f75c9ed6cf2d6031780e88ca28f",
      sha256: "8015abd6734f482658830fde37cb47afa64987098632f632c0e55dae473d99df",
      clipStart: 0.25,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 0.25\u20135.25 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    robin: {
      file: "robin.mp3",
      name: "\u6B50\u4E9E\u9D1D",
      group: "\u9CE5\u985E",
      src: "File:Erithacus rubecula - European Robin XC473253.mp3",
      url: "https://upload.wikimedia.org/wikipedia/commons/7/7a/Erithacus_rubecula_-_European_Robin_XC473253.mp3?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Erithacus_rubecula_-_European_Robin_XC473253.mp3",
      size: 81674,
      artist: "Marie-Lan Ta\xFF Pamart",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      credit: "Metadata:  https://www.xeno-canto.org/473253  \n Audio file:  https://www.xeno-canto.org/473253/download",
      description: ":Bird singing from the brush in a mixed-tree low forest.\n  Distance: <5m \n Edits: -6dB high-pass filter at 1200Hz \n Equipment: Sennheiser ME66/K6, Rycote Windjammer, Tascam DR-05 \n bird-seen:yes \n playback-used:no \n  Common name:  European Robin \n  Type:  song \n  Genus:  Erithacus \n  Species:  rubecula \n  Location:  Lagorce, Ard\xE8che, Auvergne-Rh\xF4ne-Alpes \n  Country:  France \n  Elevation:  280 m",
      sourceSha1: "5e8a43ca156e58a04783d56dcfd77db450a0105c",
      sha256: "14d4ce67efadf69823c3205ac2ef7836fa387b8aff475c758bd3ea86df92a74d",
      clipStart: 30.5,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 30.50\u201335.50 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    swallow: {
      file: "swallow.mp3",
      name: "\u5BB6\u71D5",
      group: "\u9CE5\u985E",
      src: "File:Hirundo rustica - Barn Swallow - XC83449.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Hirundo_rustica_-_Barn_Swallow_-_XC83449.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Hirundo_rustica_-_Barn_Swallow_-_XC83449.ogg",
      size: 81128,
      artist: "Jonathon Jongsma",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
      credit: "http://www.xeno-canto.org/83449",
      description: "Species    Barn Swallow \xA0(  Hirundo rustica  )  \n  Recordist  Jonathon Jongsma \n  Remarks  'twitter-warble song' from a male that landed on a boardwalk over a marshy area, about 10ft from me. \n  Location  Minnesota Valley NWR, Old Cedar Ave Bridge, Hennepin, MN \n  Elevation  200 m \n  Country  United States",
      sourceSha1: "f4f870e63ac7d6b9cb679cc5728bb5c9f9bf2404",
      sha256: "44a5b96eb8c108146608592d229288356e9f8c6377aa47f142e7e301055f643b",
      clipStart: 6.5,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 6.50\u201311.50 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    crane: {
      file: "crane.mp3",
      name: "\u7070\u9DB4",
      group: "\u9CE5\u985E",
      src: "File:Grus grus.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/0/06/Grus_grus.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Grus_grus.ogg",
      size: 81128,
      artist: "\u0412\u043E\u043B\u043A\u043E\u0432 \u0412\u043B\u0430\u0434\u0438\u0441\u043B\u0430\u0432 \u041F\u0435\u0442\u0440\u043E\u0432\u0438\u0447 (\u0441 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u044F \u0441\u0435\u0440\u043E\u0433\u043E \u0436\u0443\u0440\u0430\u0432\u043B\u044F)",
      license: "CC0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
      credit: "\u0437\u0430\u043F\u0438\u0441\u0430\u043D\u043E \u0432 \u043B\u0435\u0441\u0443",
      description: "\u041A\u0440\u0438\u043A \u0421\u0435\u0440\u043E\u0433\u043E \u0436\u0443\u0440\u0430\u0432\u043B\u044F (Grus_grus) \u0432 \u043F\u043E\u043B\u0435\u0442\u0435, \u0432 \u043C\u043E\u043C\u0435\u043D\u0442 \xAB\u043F\u0435\u0440\u0435\u043A\u043B\u0438\u0447\u043A\u0438\xBB \u0441\u0442\u0430\u0438 (22 \u043E\u0441\u043E\u0431\u0438). \u0417\u0430\u043F\u0438\u0441\u0430\u043D\u043E 17 \u0430\u043F\u0440\u0435\u043B\u044F 2011 \u0432 \u0426\u041B\u0413\u041F\u0411\u0417 (\u0426\u0435\u043D\u0442\u0440\u0430\u043B\u044C\u043D\u043E-\u043B\u0435\u0441\u043D\u043E\u0439 \u0433\u043E\u0441\u0443\u0434\u0430\u0440\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0439 \u043F\u0440\u0438\u0440\u043E\u0434\u043D\u044B\u0439 \u0431\u0438\u043E\u0441\u0444\u0435\u0440\u043D\u044B\u0439 \u0437\u0430\u043F\u043E\u0432\u0435\u0434\u043D\u0438\u043A, \u0420\u043E\u0441\u0441\u0438\u0439\u0441\u043A\u0430\u044F \u0444\u0435\u0434\u0435\u0440\u0430\u0446\u0438\u044F, \u0422\u0432\u0435\u0440\u0441\u043A\u0430\u044F \u043E\u0431\u043B\u0430\u0441\u0442\u044C, \u041D\u0435\u043B\u0438\u0434\u043E\u0432\u0441\u043A\u0438\u0439 \u0440\u0430\u0439\u043E\u043D",
      sourceSha1: "89f8c9b4dc6684d06aa7d5d144b6a01bfc42bc5f",
      sha256: "26ec1724955fe30fa55712e6a7380b952613737ffcf1351272480a65cce4a7e8",
      clipStart: 9.75,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 9.75\u201314.75 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    flamingo: {
      file: "flamingo.mp3",
      name: "\u5927\u7D05\u9E1B",
      group: "\u9CE5\u985E",
      src: "File:Greater flamingo call recorded in March 2005 at Mayani, Satara.wav",
      url: "https://upload.wikimedia.org/wikipedia/commons/1/17/Greater_flamingo_call_recorded_in_March_2005_at_Mayani%2C_Satara.wav?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Greater_flamingo_call_recorded_in_March_2005_at_Mayani,_Satara.wav",
      size: 81812,
      artist: "Sharadapte",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      credit: "Own work",
      description: "Greater flamingo call recorded in March 2005 at Mayani, Satara",
      sourceSha1: "b19e08e54c10605313eefb1855455c573edc64a5",
      sha256: "20153e7bcbd363f45142c1366778ad397086679cb39b8736c6862722dfc3732d",
      clipStart: 0.75,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 0.75\u20135.75 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    parrot: {
      file: "parrot.mp3",
      name: "\u975E\u6D32\u7070\u9E1A\u9D61",
      group: "\u9CE5\u985E",
      src: "File:Kampfgeschrei Graupapagei.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/3/32/Kampfgeschrei_Graupapagei.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Kampfgeschrei_Graupapagei.ogg",
      size: 43511,
      artist: "Oceancetaceen  Alice Chodura",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
      credit: "Own work",
      description: "Aggressives Kampfgeschrei eines Graupapageien (Psittacus erithacus erithacus)",
      sourceSha1: "1ac968ca4ed4f122292f929d6479243562e2f7ab",
      sha256: "41c2c16d9ccc8486d96e175e1d591a32b5ff8ceb76b6095a81699623419e6bf8",
      clipStart: 0,
      duration: 2.64,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 0.00\u20132.64 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    budgie: {
      file: "budgie.mp3",
      name: "\u864E\u76AE\u9E1A\u9D61",
      group: "\u9CE5\u985E",
      src: "File:Domesticated budgerigars birdsong 01.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/5/5b/Domesticated_budgerigars_birdsong_01.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Domesticated_budgerigars_birdsong_01.ogg",
      size: 81128,
      artist: "Pyb",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      credit: "Own work",
      description: "Birdsong of three domesticated budgerigars.",
      sourceSha1: "dc983ae784831e39537b5f6aecca393c969d51bf",
      sha256: "cb639f810db0e2e6b91be7543ba168e616764c31e7b6bdf3d2e85d28f2781b38",
      clipStart: 17,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 17.00\u201322.00 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    kookaburra: {
      file: "kookaburra.mp3",
      name: "\u7B11\u7FE0\u9CE5",
      group: "\u9CE5\u985E",
      src: "File:Dacelo novaeguineae ANWC X00516.opus",
      url: "https://upload.wikimedia.org/wikipedia/commons/c/c9/Dacelo_novaeguineae_ANWC_X00516.opus?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Dacelo_novaeguineae_ANWC_X00516.opus",
      size: 81128,
      artist: "Powys, V.",
      license: "CC BY 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by/3.0",
      credit: "https://biocache.ala.org.au/occurrences/73244ade-b19d-4c6d-ad44-a0dd8473d59f",
      description: "Dacelo novaeguineae",
      sourceSha1: "f615104b78b824c0e5db22376488327a69ff709b",
      sha256: "1496aec3af6d53b9f7186639b8745a781b45f97662cde2d6c3d0f1e1b6fb5d12",
      clipStart: 12.75,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 12.75\u201317.75 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    lyrebird: {
      file: "lyrebird.mp3",
      name: "\u83EF\u9E97\u7434\u9CE5",
      group: "\u9CE5\u985E",
      src: "File:Menura novaehollandiae - Superb Lyrebird XC442964.mp3",
      url: "https://upload.wikimedia.org/wikipedia/commons/4/48/Menura_novaehollandiae_-_Superb_Lyrebird_XC442964.mp3?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Menura_novaehollandiae_-_Superb_Lyrebird_XC442964.mp3",
      size: 81764,
      artist: "James Ray",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      credit: "Metadata:  https://www.xeno-canto.org/442964  \n Audio file:  https://www.xeno-canto.org/442964/download",
      description: ":Recorded while I was in the bush, it was calling from one of its mounds near rocks / cliffs, and has been seen at other times near there.\n  Silenced some bits and applied a normalize and gain (but avoiding clipping). \n bird-seen:no \n playback-used:yes \n  Common name:  Superb Lyrebird \n  Type:  call, male, mimicry, song \n  Genus:  Menura \n  Species:  novaehollandiae \n  Location:  Faulconbridge, Blue Mountains City Council, New South Wales \n  Country:  Australia \n  Elevation:  480 m",
      sourceSha1: "bd3ca6ddef5837016b464a16ef4b62a62dd9098b",
      sha256: "2601cb76dbb7bb2372af0155d5174d5b2cd8a1ce85ac53903df88b9db0c360ec",
      clipStart: 0,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 0.00\u20135.00 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    wren: {
      file: "wren.mp3",
      name: "\u9DE6\u9DEF",
      group: "\u9CE5\u985E",
      src: "File:Troglodytes troglodytes - Eurasian Wren XC461185.mp3",
      url: "https://upload.wikimedia.org/wikipedia/commons/e/e2/Troglodytes_troglodytes_-_Eurasian_Wren_XC461185.mp3?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Troglodytes_troglodytes_-_Eurasian_Wren_XC461185.mp3",
      size: 81515,
      artist: "Marie-Lan Ta\xFF Pamart",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      credit: "Metadata:  https://www.xeno-canto.org/461185  \n Audio file:  https://www.xeno-canto.org/461185/download",
      description: ":bird-seen:yes\n  playback-used:no \n  Common name:  Eurasian Wren \n  Type:  male, song \n  Genus:  Troglodytes \n  Species:  troglodytes \n  Location:  Botanical school, Jardin des Plantes, Paris, \xCEle-de-France \n  Country:  France \n  Elevation:  40 m",
      sourceSha1: "f9a0c3a0df19dc624e014c66143e19006279ee45",
      sha256: "8b9e33791c7c6f789193dc333d8ee96bea1212d77a1c1fb80d378386d7c37d20",
      clipStart: 22.25,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 22.25\u201327.25 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    great_tit: {
      file: "great_tit.mp3",
      name: "\u5927\u5C71\u96C0",
      group: "\u9CE5\u985E",
      src: "File:Parus major - Great Tit XC129643.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/c/cd/Parus_major_-_Great_Tit_XC129643.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Parus_major_-_Great_Tit_XC129643.ogg",
      size: 81128,
      artist: "Gavin Vella",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
      credit: "Metadata:   https://xeno-canto.org/129643  \n  Audio file:   http://www.xeno-canto.org/download.php?XC=129643",
      description: "None given\n    Common name:  Great Tit \n  Type:  song \n  Genus:  Parus \n  Species:  major \n  Location:  Pen Tranch, Torfaen, Wales \n  Elevation:  280 m",
      sourceSha1: "bf871da6edb1d512b6d685f7ba92b435ca7b1bd2",
      sha256: "931d2e8d6e4f627cb58c2e8fe4debf68d1126605b2e31595b9826f5e23e955d3",
      clipStart: 28.5,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 28.50\u201333.50 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    blue_tit: {
      file: "blue_tit.mp3",
      name: "\u85CD\u5C71\u96C0",
      group: "\u9CE5\u985E",
      src: "File:Cyanistes caeruleus - Eurasian Blue Tit XC121562.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/2/26/Cyanistes_caeruleus_-_Eurasian_Blue_Tit_XC121562.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Cyanistes_caeruleus_-_Eurasian_Blue_Tit_XC121562.ogg",
      size: 81128,
      artist: "Adrienne Eaton",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
      credit: "Metadata:   http://xeno-canto.org/121562  \n  Audio file:   http://www.xeno-canto.org/download.php?XC=121562",
      description: ":Recorded from my balcony near the Tiergarten, Berlin. The clip was edited to remove street sounds.\n  bird-seen:no \n playback-used:no \n  Common name:  Eurasian Blue Tit \n  Type:  song \n  Genus:  Cyanistes \n  Species:  caeruleus \n  Location:  Berlin, Berlin \n  Elevation:  30 m",
      sourceSha1: "15ece359ec6c6520bc2d02b8e27ac5603a3c2e0f",
      sha256: "abf848d84811531b49aa04a76649347eb2fc9b1bd864a07b4e72e312cca92519",
      clipStart: 6,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 6.00\u201311.00 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    lapwing: {
      file: "lapwing.mp3",
      name: "\u5C0F\u8FAE\u9D34",
      group: "\u9CE5\u985E",
      src: "File:Vanellus vanellus - Northern Lapwing XC467004.mp3",
      url: "https://upload.wikimedia.org/wikipedia/commons/e/e5/Vanellus_vanellus_-_Northern_Lapwing_XC467004.mp3?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Vanellus_vanellus_-_Northern_Lapwing_XC467004.mp3",
      size: 81803,
      artist: "Marie-Lan Ta\xFF Pamart",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      credit: "Metadata:  https://www.xeno-canto.org/467004  \n Audio file:  https://www.xeno-canto.org/467004/download",
      description: ":Bird calling from the ground amongst a groupe of ~8 Northern Lapwings\n  Distance: about 40m \n Habitat: gravel pit, next to a road \n Equipment: Tascam DR05 + Sennheiser ME66 + Rycote Windjammer \n Edits: 900Hz high-pass filter + slight amplification \n bird-seen:yes \n playback-used:no \n  Common name:  Northern Lapwing \n  Type:  call, song \n  Genus:  Vanellus \n  Species:  vanellus \n  Location:  Saint-Martin-la-Garenne, Yvelines, \xCEle-de-France \n  Country:  France \n  Elevation:  10 m",
      sourceSha1: "e9cf5582c42fe499dd2a11ba899353e8f9654d2f",
      sha256: "1017cea74401460f6511f52c80e9df7c52b2884202503760a9b3f43d426b64d0",
      clipStart: 42.5,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 42.50\u201347.50 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    pheasant: {
      file: "pheasant.mp3",
      name: "\u74B0\u9838\u96C9",
      group: "\u9CE5\u985E",
      src: "File:Phasianus colchicus - Common Pheasant - XC115583.ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/8/88/Phasianus_colchicus_-_Common_Pheasant_-_XC115583.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Phasianus_colchicus_-_Common_Pheasant_-_XC115583.ogg",
      size: 81128,
      artist: "Jonathon Jongsma",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
      credit: "http://www.xeno-canto.org/115583",
      description: "Species    Common Pheasant \xA0(  Phasianus colchicus  )  \n  Recordist  Jonathon Jongsma \n  Remarks  Calls and wing sounds from a male bird that was accidentally flushed. \n  Bird seen  yes \n  Playback used  no \n  Elevation  440 m \n  Country  United States",
      sourceSha1: "1670da22c430742a2266e472efabe390075901da",
      sha256: "b8fdaa409ad38348e0e3c3b3a652542fce5be0254067e2a44a3191702704296b",
      clipStart: 1,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 1.00\u20136.00 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    },
    quail: {
      file: "quail.mp3",
      name: "\u9D6A\u9D89",
      group: "\u9CE5\u985E",
      src: "File:Common Quail (Coturnix coturnix) (W1CDR0001390 BD1).ogg",
      url: "https://upload.wikimedia.org/wikipedia/commons/7/77/Common_Quail_%28Coturnix_coturnix%29_%28W1CDR0001390_BD1%29.ogg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original",
      sourcePage: "https://commons.wikimedia.org/wiki/File:Common_Quail_(Coturnix_coturnix)_(W1CDR0001390_BD1).ogg",
      size: 81128,
      artist: "Lawrence Shove\uFF1B\xA9 The British Library Board",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
      credit: "This file has been provided by the British Library from its digital collections. Links to the British Library's website may be broken as the library recovers from a October 2023 cyber attack, and will be updated once material becomes accessible online. For more information on the attack see:  https://www.bl.uk/about/cyber-attack  It is also  made available on a British Library website .",
      description: "Advertising call of a male Common quail, recorded at Winbourne, Devon, England",
      sourceSha1: "4290c8ebf1a7b98fe93fb0538cd7d11e364790f5",
      sha256: "e44ac80add190f6e9c812e418ee4376b87c95d410daf920507abeb98df1c68ca",
      clipStart: 0.5,
      duration: 5,
      modifications: "\u64F7\u53D6\u539F\u9304\u97F3 0.50\u20135.50 \u79D2\uFF1B\u55AE\u8072\u9053 MP3\uFF1B\u8ABF\u6574\u97F3\u91CF\u4E26\u52A0\u6975\u77ED\u6DE1\u5165\u6DE1\u51FA\uFF0C\u672A\u6539\u8B8A\u97F3\u9AD8\u6216\u901F\u5EA6\u3002",
      addedOn: "2026-09-11"
    }
  };

  // data/resource-logos.json
  var resource_logos_default = {
    phet: {
      logo: "phet.png",
      src: "https://phet.colorado.edu/images/phet-logo-trademarked.png",
      final: [
        320,
        150
      ]
    },
    pedia: {
      logo: "pedia.png",
      src: "https://pedia.cloud.edu.tw/Content/Images/logo/logo_small_white.png",
      orig: [
        439,
        89
      ],
      final: [
        320,
        65
      ]
    },
    cdc: {
      logo: "cdc.png",
      src: "https://upload.wikimedia.org/wikipedia/commons/e/e3/CDC_logo_2024.png",
      final: [
        320,
        252
      ],
      license: "Public domain (US federal)"
    },
    mdn: {
      logo: "mdn.png",
      src: "https://developer.mozilla.org/apple-touch-icon.png",
      final: [
        118,
        107
      ],
      note: "luminance-keyed white wordmark"
    },
    sciencelearn: {
      logo: "sciencelearn.png",
      src: "https://www.sciencelearn.org.nz/images/favicon/apple-touch-icon-180x180.png",
      orig: [
        180,
        180
      ],
      final: [
        167,
        155
      ]
    },
    cwa: {
      logo: "cwa.png",
      src: "https://www.cwa.gov.tw/V8/assets/img/win10/cwbPinlogo310.png",
      final: [
        261,
        155
      ],
      note: "CWA emblem keyed to white wave silhouette"
    }
  };

  // js/app.js
  var isLocalFile = window.location.protocol === "file:";
  var tabs = [...document.querySelectorAll(".tab")];
  var panels = [...document.querySelectorAll(".panel")];
  var progressText = document.querySelector("#progressText");
  var progressBar = document.querySelector("#progressBar");
  var tabPosition = document.querySelector("#tabPosition");
  var visited = new Set(JSON.parse(localStorage.getItem("audioLabVisited") || '["mission"]'));
  var audioContext;
  var oscillator;
  var toneGain;
  var sweepTimer;
  var micStream;
  var micSource;
  var micGain;
  var micMonitorGain;
  var micAnalyser;
  var micWasSilent = false;
  var micDescriptionFrequency;
  var micDescriptionWave;
  var micDescriptionHistory = [];
  var micDescriptionSampleAt = 0;
  var micDescriptionRenderAt = 0;
  var soundDescription = document.querySelector("#soundDescription");
  var soundDescriptionEvidence = document.querySelector("#soundDescriptionEvidence");
  var soundDescriptionStatus = document.querySelector("#soundDescriptionStatus");
  var mediaElementSource;
  var mediaActiveSource;
  var mediaAnalyser;
  var mediaConnected = false;
  var mediaMode = "idle";
  var capturedAudioStream;
  var loadedMediaUrl = "";
  var challengeAnswer = null;
  var challengePlayback = null;
  var challengePlaybackRequest = 0;
  var bioAnswer = null;
  var bioScore = 0;
  var bioRound = 0;
  var quizQuestions = [];
  var quizIndex = 0;
  var quizCorrect = 0;
  var quizAnswered = false;
  var quizSpeechTimer;
  var canvases = {
    tone: document.querySelector("#toneCanvas"),
    mic: document.querySelector("#micCanvas"),
    media: document.querySelector("#mediaCanvas")
  };
  var ctxs = Object.fromEntries(Object.entries(canvases).map(([key, canvas]) => [key, canvas.getContext("2d")]));
  var micDeviceSelect = document.querySelector("#micDevice");
  async function ensureAudio() {
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
    return audioContext;
  }
  function switchTab(id) {
    tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === id));
    panels.forEach((panel) => panel.classList.toggle("active", panel.id === id));
    document.body.classList.toggle("quiz-mode", id === "quiz");
    visited.add(id);
    localStorage.setItem("audioLabVisited", JSON.stringify([...visited]));
    updateProgress();
    document.querySelector(`#${id}`).focus({ preventScroll: true });
  }
  function updateProgress() {
    const activeIndex = tabs.findIndex((tab) => tab.classList.contains("active"));
    const percent = Math.round(visited.size / tabs.length * 100);
    progressText.textContent = `${percent}%`;
    progressBar.style.width = `${percent}%`;
    tabPosition.textContent = `${activeIndex + 1} / ${tabs.length}`;
  }
  tabs.forEach((tab) => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));
  document.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.go));
  });
  document.querySelector("#prevTab").addEventListener("click", () => {
    const index = tabs.findIndex((tab) => tab.classList.contains("active"));
    switchTab(tabs[Math.max(0, index - 1)].dataset.tab);
  });
  document.querySelector("#nextTab").addEventListener("click", () => {
    const index = tabs.findIndex((tab) => tab.classList.contains("active"));
    switchTab(tabs[Math.min(tabs.length - 1, index + 1)].dataset.tab);
  });
  function drawGrid(ctx, width, height) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#050a12";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#162841";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 42) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }
  function drawToneWave() {
    const canvas = canvases.tone;
    const ctx = ctxs.tone;
    const frequency = Number(document.querySelector("#frequencyInput").value);
    const volume = Number(document.querySelector("#volumeRange").value);
    drawGrid(ctx, canvas.width, canvas.height);
    ctx.lineWidth = 4;
    ctx.strokeStyle = frequency > 12e3 ? "#ffbf3f" : frequency > 2e3 ? "#4e8cff" : "#18b6a2";
    ctx.beginPath();
    const cycles = Math.max(0.5, Math.min(28, frequency / 360));
    const amp = 36 + volume * 520;
    for (let x = 0; x < canvas.width; x += 2) {
      const y = canvas.height / 2 + Math.sin(x / canvas.width * cycles * Math.PI * 2) * amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "#e9f2ff";
    ctx.font = "22px Microsoft JhengHei, sans-serif";
    ctx.fillText(`${frequency.toLocaleString()} Hz`, 28, 42);
    requestAnimationFrame(drawToneWave);
  }
  function updateToneLabels() {
    const frequency = Number(document.querySelector("#frequencyInput").value);
    document.querySelector("#currentFrequency").textContent = `${frequency.toLocaleString()} Hz`;
    document.querySelector("#waveLabel").textContent = frequency < 300 ? "\u6CE2\u8DDD\u9577" : frequency < 2e3 ? "\u4E2D\u7B49" : "\u6CE2\u8DDD\u77ED";
    document.querySelector("#pitchLabel").textContent = frequency < 80 ? "\u63A5\u8FD1\u4F4E\u983B\u9707\u52D5" : frequency < 300 ? "\u4F4E\u6C89" : frequency < 2e3 ? "\u6E05\u695A\u53EF\u8FA8" : frequency < 9e3 ? "\u5C16\u4EAE" : "\u6975\u9AD8\u983B";
    if (oscillator) oscillator.frequency.setTargetAtTime(Math.max(1, frequency), audioContext.currentTime, 0.01);
  }
  function setFrequency(value) {
    const next = Math.min(3e4, Math.max(0, Number(value) || 0));
    document.querySelector("#frequencyInput").value = next;
    document.querySelector("#frequencyRange").value = next;
    updateToneLabels();
  }
  document.querySelector("#frequencyRange").addEventListener("input", (event) => setFrequency(event.target.value));
  document.querySelector("#setFrequency").addEventListener("click", () => setFrequency(document.querySelector("#frequencyInput").value));
  document.querySelectorAll("[data-frequency]").forEach((button) => {
    button.addEventListener("click", () => setFrequency(button.dataset.frequency));
  });
  document.querySelector("#volumeRange").addEventListener("input", (event) => {
    if (toneGain) toneGain.gain.setTargetAtTime(Number(event.target.value), audioContext.currentTime, 0.02);
  });
  function stopTone() {
    clearInterval(sweepTimer);
    sweepTimer = null;
    if (oscillator) {
      oscillator.stop();
      oscillator.disconnect();
      oscillator = null;
    }
  }
  document.querySelector("#playTone").addEventListener("click", () => {
    stopTone();
    ensureAudio().then((context) => {
      oscillator = context.createOscillator();
      toneGain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = Math.max(1, Number(document.querySelector("#frequencyInput").value));
      toneGain.gain.value = Number(document.querySelector("#volumeRange").value);
      oscillator.connect(toneGain).connect(context.destination);
      oscillator.start();
    });
  });
  document.querySelector("#stopTone").addEventListener("click", stopTone);
  document.querySelector("#sweepTone").addEventListener("click", () => {
    document.querySelector("#playTone").click();
    let value = 120;
    clearInterval(sweepTimer);
    sweepTimer = setInterval(() => {
      value += 120;
      setFrequency(value);
      if (value >= 6e3) {
        clearInterval(sweepTimer);
        sweepTimer = null;
      }
    }, 120);
  });
  function rmsToDb(data) {
    let sum = 0;
    for (const value of data) {
      const centered = (value - 128) / 128;
      sum += centered * centered;
    }
    const rms = Math.sqrt(sum / data.length);
    return Math.max(0, Math.min(100, 20 * Math.log10(rms || 1e-5) + 100));
  }
  async function loadMicDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      document.querySelector("#micStatus").textContent = "\u9019\u500B\u700F\u89BD\u5668\u4E0D\u652F\u63F4\u9EA5\u514B\u98A8\u88DD\u7F6E\u5217\u8868\u3002";
      return;
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((device) => device.kind === "audioinput");
    const previous = micDeviceSelect.value;
    micDeviceSelect.innerHTML = '<option value="">\u700F\u89BD\u5668\u9810\u8A2D\u9EA5\u514B\u98A8</option>';
    audioInputs.forEach((device, index) => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.textContent = device.label || `\u9EA5\u514B\u98A8 ${index + 1}`;
      micDeviceSelect.append(option);
    });
    if ([...micDeviceSelect.options].some((option) => option.value === previous)) {
      micDeviceSelect.value = previous;
    }
    document.querySelector("#micStatus").textContent = audioInputs.length ? `\u5075\u6E2C\u5230 ${audioInputs.length} \u500B\u8F38\u5165\u88DD\u7F6E\uFF0C\u8ACB\u9078\u4E00\u500B\u518D\u958B\u555F\u9EA5\u514B\u98A8\u3002` : "\u6C92\u6709\u5075\u6E2C\u5230\u9EA5\u514B\u98A8\u8F38\u5165\u88DD\u7F6E\u3002";
  }
  function getWaveStats(data) {
    let min = 255;
    let max = 0;
    let sum = 0;
    for (const value of data) {
      if (value < min) min = value;
      if (value > max) max = value;
      const centered = value - 128;
      sum += centered * centered;
    }
    return {
      min,
      max,
      peakToPeak: max - min,
      rms: Math.sqrt(sum / data.length) / 128
    };
  }
  function drawSpectrum(canvas, ctx, analyser, mode = "bars") {
    const data = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Uint8Array(analyser.fftSize);
    analyser.getByteFrequencyData(data);
    analyser.getByteTimeDomainData(timeData);
    drawGrid(ctx, canvas.width, canvas.height);
    const barWidth = canvas.width / data.length;
    let max = 0;
    let maxIndex = 0;
    let highEnergy = 0;
    let lowEnergy = 0;
    data.forEach((value, index) => {
      if (value > max) {
        max = value;
        maxIndex = index;
      }
      if (index < data.length * 0.16) lowEnergy += value;
      if (index > data.length * 0.55) highEnergy += value;
      const height = Math.max(mode === "mic" && value > 0 ? 3 : 0, value / 255 * canvas.height * 0.82);
      const hue = mode === "media" ? 170 + index / data.length * 120 : 170 - index / data.length * 80;
      ctx.fillStyle = `hsl(${hue}, 86%, ${42 + value / 8}%)`;
      ctx.fillRect(index * barWidth, canvas.height - height, Math.max(1, barWidth - 1), height);
    });
    const waveStats = getWaveStats(timeData);
    if (mode === "media" || mode === "mic") {
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = mode === "mic" ? "rgba(255, 191, 63, 0.86)" : "rgba(255, 191, 63, 0.75)";
      ctx.lineWidth = mode === "mic" ? 4 : 3;
      ctx.beginPath();
      const autoScale = mode === "mic" ? Math.max(1, Math.min(28, 72 / Math.max(1, waveStats.peakToPeak))) : 1;
      for (let i = 0; i < timeData.length; i += 4) {
        const x = i / timeData.length * canvas.width;
        const y = canvas.height * 0.46 + (timeData[i] - 128) / 128 * (mode === "mic" ? 130 * autoScale : 90);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      if (mode === "mic") {
        ctx.fillStyle = waveStats.peakToPeak <= 2 ? "#ffbf3f" : "#a8b8cc";
        ctx.font = "20px Microsoft JhengHei, sans-serif";
        ctx.fillText(`\u8A0A\u865F\u632F\u5E45 ${waveStats.peakToPeak}`, 24, canvas.height - 24);
      }
    }
    const db = rmsToDb(timeData);
    const peakFrequency = Math.round(maxIndex * audioContext.sampleRate / analyser.fftSize);
    return { db, peakFrequency, lowEnergy, highEnergy, max, waveStats };
  }
  async function startMic() {
    const context = await ensureAudio();
    if (micStream) stopMic();
    const deviceId = micDeviceSelect.value;
    const audioConstraints = deviceId ? { deviceId: { exact: deviceId } } : true;
    micStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    micSource = context.createMediaStreamSource(micStream);
    micGain = context.createGain();
    micGain.gain.value = Number(document.querySelector("#micSensitivity").value);
    micMonitorGain = context.createGain();
    micMonitorGain.gain.value = 0;
    micAnalyser = context.createAnalyser();
    micAnalyser.fftSize = 4096;
    micAnalyser.minDecibels = -110;
    micAnalyser.maxDecibels = -10;
    micAnalyser.smoothingTimeConstant = 0.55;
    micWasSilent = false;
    micDescriptionFrequency = new Float32Array(micAnalyser.frequencyBinCount);
    micDescriptionWave = new Float32Array(micAnalyser.fftSize);
    resetSoundDescription("\u6B63\u5728\u6536\u97F3\uFF0C\u8ACB\u767C\u51FA\u8072\u97F3\uFF0C\u89C0\u5BDF\u97F3\u8CEA\u8207\u97F3\u8272\u7684\u8B8A\u5316\u3002", "\u6B63\u5728\u89C0\u5BDF");
    document.querySelector("#freezeMic").checked = false;
    micSource.connect(micGain);
    micGain.connect(micAnalyser);
    micGain.connect(micMonitorGain).connect(context.destination);
    const track = micStream.getAudioTracks()[0];
    track?.addEventListener("ended", stopMic, { once: true });
    const label = track?.label ? `\u88DD\u7F6E\uFF1A${track.label}\u3002` : "";
    await loadMicDevices();
    document.querySelector("#micStatus").textContent = `\u9EA5\u514B\u98A8\u5DF2\u555F\u7528\uFF0CAudioContext\uFF1A${context.state}\u3002${label}\u8ACB\u8ABF\u6574\u9748\u654F\u5EA6\u4E26\u8AAA\u8A71\u6216\u62CD\u624B\u3002`;
  }
  function stopMic() {
    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
    }
    micSource?.disconnect();
    micGain?.disconnect();
    micMonitorGain?.disconnect();
    micAnalyser?.disconnect();
    micStream = null;
    micSource = null;
    micGain = null;
    micMonitorGain = null;
    micAnalyser = null;
    micDescriptionFrequency = null;
    micDescriptionWave = null;
    document.querySelector("#freezeMic").checked = false;
    document.querySelector("#dbValue").textContent = "-- dB";
    document.querySelector("#peakFrequency").textContent = "-- Hz";
    document.querySelector("#soundState").textContent = "\u5DF2\u505C\u6B62";
    document.querySelector("#dbFill").style.height = "0%";
    resetSoundDescription("\u6536\u97F3\u5DF2\u505C\u6B62\u3002\u91CD\u65B0\u958B\u555F\u9EA5\u514B\u98A8\u5F8C\uFF0C\u6703\u7E7C\u7E8C\u63CF\u8FF0\u76EE\u524D\u8072\u97F3\u7684\u97F3\u8CEA\u8207\u97F3\u8272\u3002", "\u5DF2\u505C\u6B62");
    document.querySelector("#micStatus").textContent = "\u9EA5\u514B\u98A8\u5DF2\u505C\u6B62\u3002";
  }
  document.querySelector("#startMic").addEventListener("click", async () => {
    try {
      await startMic();
    } catch (error) {
      document.querySelector("#micStatus").textContent = `\u7121\u6CD5\u958B\u555F\u9EA5\u514B\u98A8\uFF1A${error.message}`;
      resetSoundDescription("\u76EE\u524D\u7121\u6CD5\u6536\u97F3\u3002\u8ACB\u78BA\u8A8D\u9EA5\u514B\u98A8\u6B0A\u9650\u8207\u8F38\u5165\u88DD\u7F6E\u5F8C\uFF0C\u518D\u958B\u555F\u9EA5\u514B\u98A8\u3002", "\u7121\u6CD5\u6536\u97F3");
    }
  });
  document.querySelector("#stopMic").addEventListener("click", stopMic);
  document.querySelector("#refreshMicDevices").addEventListener("click", async () => {
    try {
      await loadMicDevices();
    } catch (error) {
      document.querySelector("#micStatus").textContent = `\u7121\u6CD5\u5075\u6E2C\u9EA5\u514B\u98A8\uFF1A${error.message}`;
    }
  });
  micDeviceSelect.addEventListener("change", async () => {
    if (!micStream) return;
    try {
      await startMic();
    } catch (error) {
      document.querySelector("#micStatus").textContent = `\u5207\u63DB\u9EA5\u514B\u98A8\u5931\u6557\uFF1A${error.message}`;
    }
  });
  document.querySelector("#micSensitivity").addEventListener("input", (event) => {
    if (micGain && audioContext) {
      micGain.gain.setTargetAtTime(Number(event.target.value), audioContext.currentTime, 0.03);
    }
  });
  function resetSoundDescription(text, state) {
    micDescriptionHistory = [];
    micDescriptionSampleAt = 0;
    micDescriptionRenderAt = 0;
    soundDescription.textContent = text;
    soundDescriptionEvidence.textContent = "";
    soundDescriptionStatus.textContent = state;
  }
  document.querySelector("#freezeMic").addEventListener("change", (event) => {
    if (!micAnalyser) return;
    soundDescriptionStatus.textContent = event.target.checked ? "\u5DF2\u51CD\u7D50\u30FB\u4FDD\u7559\u7576\u4E0B\u63CF\u8FF0" : "\u6B63\u5728\u89C0\u5BDF";
    if (!event.target.checked) {
      micDescriptionHistory = [];
      micDescriptionSampleAt = 0;
      micDescriptionRenderAt = 0;
    }
  });
  function updateSoundDescription(now) {
    if (now - micDescriptionSampleAt < 250) return;
    micDescriptionSampleAt = now;
    micAnalyser.getFloatFrequencyData(micDescriptionFrequency);
    micAnalyser.getFloatTimeDomainData(micDescriptionWave);
    micDescriptionHistory.push(spectrumFeatures(micDescriptionFrequency, micDescriptionWave, audioContext.sampleRate, micAnalyser.fftSize));
    if (micDescriptionHistory.length > 6) micDescriptionHistory.shift();
    if (now - micDescriptionRenderAt < 750) return;
    micDescriptionRenderAt = now;
    const description = describeSound(micDescriptionHistory);
    if (soundDescription.textContent !== description.text) soundDescription.textContent = description.text;
    soundDescriptionEvidence.textContent = description.evidence;
    soundDescriptionStatus.textContent = description.state;
  }
  function animateMic(now = performance.now()) {
    if (micAnalyser && !document.querySelector("#freezeMic").checked) {
      const result = drawSpectrum(canvases.mic, ctxs.mic, micAnalyser, "mic");
      updateSoundDescription(now);
      document.querySelector("#dbValue").textContent = `${result.db.toFixed(1)} dB`;
      document.querySelector("#peakFrequency").textContent = result.max > 2 && result.waveStats.peakToPeak > 2 ? `${result.peakFrequency} Hz` : "-- Hz";
      document.querySelector("#dbFill").style.height = `${result.db}%`;
      document.querySelector("#soundState").textContent = result.waveStats.peakToPeak <= 2 ? "\u672A\u6536\u5230\u8A0A\u865F" : result.db < 35 ? "\u5B89\u975C" : result.db < 68 ? "\u4E00\u822C\u8072\u97F3" : "\u504F\u5927\u8072";
      if (result.waveStats.peakToPeak <= 2) {
        micWasSilent = true;
        const selectedLabel = micDeviceSelect.selectedOptions[0]?.textContent || "\u76EE\u524D\u88DD\u7F6E";
        document.querySelector("#micStatus").textContent = `${selectedLabel} \u5DF2\u958B\u555F\uFF0C\u4F46\u76EE\u524D\u6536\u5230\u975C\u97F3\u3002\u8ACB\u5F9E\u300C\u8F38\u5165\u88DD\u7F6E\u300D\u6539\u9078\u5176\u4ED6\u9EA5\u514B\u98A8\uFF0C\u6216\u6AA2\u67E5 Windows \u8F38\u5165\u97F3\u91CF\u662F\u5426\u6709\u8DF3\u52D5\u3002`;
      } else if (micWasSilent) {
        micWasSilent = false;
        document.querySelector("#micStatus").textContent = "\u5DF2\u6536\u5230\u8072\u97F3\uFF0C\u8B5C\u5716\u8207\u97F3\u8CEA\u3001\u97F3\u8272\u63CF\u8FF0\u6703\u96A8\u6536\u97F3\u66F4\u65B0\u3002";
      }
    } else if (!micAnalyser) {
      drawIdle(canvases.mic, ctxs.mic, "\u7B49\u5F85\u9EA5\u514B\u98A8");
    }
    requestAnimationFrame(animateMic);
  }
  var mediaPlayer = document.querySelector("#mediaPlayer");
  var mediaStatus = document.querySelector("#mediaStatus");
  var youtubeEmbed = document.querySelector("#youtubeEmbed");
  var youtubeFallback = document.querySelector("#youtubeFallback");
  function getYouTubeId(url) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes("youtu.be")) {
        return parsed.pathname.split("/").filter(Boolean)[0] || "";
      }
      if (parsed.hostname.includes("youtube.com")) {
        if (parsed.pathname.startsWith("/shorts/") || parsed.pathname.startsWith("/embed/")) {
          return parsed.pathname.split("/").filter(Boolean)[1] || "";
        }
        return parsed.searchParams.get("v") || "";
      }
    } catch {
      return "";
    }
    return "";
  }
  function resetMediaAnalysis() {
    mediaMode = "idle";
    document.querySelector("#beatEnergy").textContent = "--";
    document.querySelector("#brightnessValue").textContent = "--";
  }
  function stopCapturedAudio() {
    if (capturedAudioStream) {
      capturedAudioStream.getTracks().forEach((track) => track.stop());
    }
    capturedAudioStream = null;
  }
  function connectMediaAnalysis(source, context) {
    if (!mediaAnalyser) {
      mediaAnalyser = context.createAnalyser();
      mediaAnalyser.fftSize = 2048;
    }
    if (mediaActiveSource && mediaActiveSource !== source) {
      try {
        mediaActiveSource.disconnect();
      } catch {
      }
      mediaConnected = false;
    }
    if (!mediaConnected || mediaActiveSource !== source) {
      source.connect(mediaAnalyser);
      mediaAnalyser.connect(context.destination);
      mediaActiveSource = source;
      mediaConnected = true;
    }
  }
  function loadMediaUrl(url) {
    if (!url) return "empty";
    loadedMediaUrl = url;
    resetMediaAnalysis();
    stopCapturedAudio();
    const youtubeId = getYouTubeId(url);
    if (youtubeId) {
      const safeYouTubeUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}`;
      mediaPlayer.pause();
      mediaPlayer.removeAttribute("src");
      mediaPlayer.load();
      mediaPlayer.hidden = true;
      mediaMode = "youtube";
      youtubeFallback.hidden = false;
      youtubeFallback.innerHTML = `<strong>YouTube \u9023\u7D50</strong><p class="hint">YouTube \u4E0D\u80FD\u88AB\u7DB2\u9801\u76F4\u63A5\u8B80\u53D6\u8072\u97F3\u3002\u6309\u300C\u64AD\u653E\u300D\u6216\u300C\u5206\u6790 YouTube \u8072\u97F3\u300D\u5F8C\uFF0C\u8ACB\u5728 Chrome \u5206\u4EAB\u8996\u7A97\u9078\u64C7\u64AD\u653E\u4E2D\u7684 YouTube \u5206\u9801\u4E26\u52FE\u9078\u5206\u9801\u97F3\u8A0A\u3002</p><a href="${safeYouTubeUrl}" target="_blank" rel="noreferrer">\u5728 YouTube \u958B\u555F</a>`;
      youtubeEmbed.hidden = false;
      youtubeEmbed.innerHTML = `<iframe title="YouTube \u64AD\u653E\u5668" src="https://www.youtube.com/embed/${youtubeId}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
      mediaStatus.textContent = "\u5DF2\u8F09\u5165 YouTube\u3002\u6309\u300C\u64AD\u653E\u300D\u6703\u958B\u555F Chrome \u5206\u9801\u97F3\u8A0A\u64F7\u53D6\u8996\u7A97\uFF1B\u9078\u64C7 YouTube \u5206\u9801\u4E26\u52FE\u9078\u5206\u9801\u97F3\u8A0A\u5F8C\uFF0C\u5C31\u6703\u7522\u751F\u97F3\u983B\u5716\u3002";
      drawIdle(canvases.media, ctxs.media, "\u6309\u64AD\u653E\u5F8C\u9078\u64C7 YouTube \u5206\u9801\u97F3\u8A0A");
      return "youtube";
    }
    youtubeEmbed.hidden = true;
    youtubeEmbed.innerHTML = "";
    youtubeFallback.hidden = true;
    youtubeFallback.innerHTML = "";
    mediaPlayer.hidden = false;
    mediaMode = "direct";
    mediaPlayer.src = url;
    mediaStatus.textContent = "\u5DF2\u8F09\u5165\u76F4\u63A5\u5A92\u9AD4\u7DB2\u5740\uFF0C\u6309\u64AD\u653E\u5F8C\u6703\u7522\u751F\u52D5\u614B\u97F3\u983B\u5716\u3002\u82E5\u4ECD\u7121\u6CD5\u64AD\u653E\uFF0C\u4F86\u6E90\u7DB2\u7AD9\u53EF\u80FD\u5C01\u9396\u8DE8\u7AD9\u4E32\u6D41\u3002";
    return "direct";
  }
  async function captureTabAudio() {
    const context = await ensureAudio();
    stopCapturedAudio();
    capturedAudioStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true
    });
    const hasAudio = capturedAudioStream.getAudioTracks().length > 0;
    if (!hasAudio) {
      capturedAudioStream.getTracks().forEach((track) => track.stop());
      capturedAudioStream = null;
      mediaStatus.textContent = "\u6C92\u6709\u64F7\u53D6\u5230\u5206\u9801\u97F3\u8A0A\u3002\u8ACB\u5728 Chrome \u5206\u4EAB\u8996\u7A97\u9078\u64C7\u5206\u9801\uFF0C\u4E26\u52FE\u9078\u300C\u5206\u4EAB\u5206\u9801\u97F3\u8A0A\u300D\u3002";
      return;
    }
    const streamSource = context.createMediaStreamSource(capturedAudioStream);
    connectMediaAnalysis(streamSource, context);
    mediaMode = "capture";
    mediaStatus.textContent = "\u6B63\u5728\u5206\u6790 YouTube/\u5206\u9801\u97F3\u8A0A\u3002\u8ACB\u78BA\u8A8D\u5F71\u7247\u6B63\u5728\u64AD\u653E\uFF0C\u4E14\u5206\u4EAB\u6642\u6709\u52FE\u9078\u5206\u9801\u97F3\u8A0A\u3002";
    capturedAudioStream.getVideoTracks().forEach((track) => {
      track.addEventListener("ended", () => {
        mediaMode = "idle";
        mediaStatus.textContent = "\u5206\u9801\u97F3\u8A0A\u64F7\u53D6\u5DF2\u505C\u6B62\u3002";
      });
    });
  }
  document.querySelector("#mediaFile").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      resetMediaAnalysis();
      stopCapturedAudio();
      youtubeEmbed.hidden = true;
      youtubeEmbed.innerHTML = "";
      youtubeFallback.hidden = true;
      youtubeFallback.innerHTML = "";
      mediaPlayer.hidden = false;
      mediaMode = "direct";
      loadedMediaUrl = "";
      mediaPlayer.src = URL.createObjectURL(file);
      mediaStatus.textContent = "\u5DF2\u8F09\u5165\u672C\u6A5F\u5A92\u9AD4\u6A94\uFF0C\u6309\u64AD\u653E\u5F8C\u6703\u7522\u751F\u52D5\u614B\u97F3\u983B\u5716\u3002";
    }
  });
  document.querySelector("#loadUrl").addEventListener("click", () => {
    const url = document.querySelector("#mediaUrl").value.trim();
    loadMediaUrl(url);
  });
  document.querySelector("#playMedia").addEventListener("click", async () => {
    const url = document.querySelector("#mediaUrl").value.trim();
    if (url && (url !== loadedMediaUrl || mediaMode !== "direct" && mediaMode !== "youtube")) {
      loadMediaUrl(url);
    }
    if (mediaMode === "youtube") {
      mediaStatus.textContent = "\u6B63\u5728\u958B\u555F\u5206\u9801\u97F3\u8A0A\u64F7\u53D6\u3002\u8ACB\u9078\u64C7\u64AD\u653E YouTube \u7684\u5206\u9801\uFF0C\u4E26\u52FE\u9078\u300C\u5206\u4EAB\u5206\u9801\u97F3\u8A0A\u300D\u3002";
      try {
        await captureTabAudio();
      } catch (error) {
        mediaStatus.textContent = `\u7121\u6CD5\u5206\u6790 YouTube \u8072\u97F3\uFF1A${error.message}`;
      }
      return;
    }
    if (mediaPlayer.hidden || !mediaPlayer.currentSrc) {
      if (url) loadMediaUrl(url);
      if (mediaPlayer.hidden || !mediaPlayer.currentSrc) {
        mediaStatus.textContent = "\u76EE\u524D\u6C92\u6709\u53EF\u5206\u6790\u7684\u5A92\u9AD4\u3002\u8ACB\u8CBC\u4E0A\u76F4\u63A5\u5A92\u9AD4\u7DB2\u5740\uFF0C\u6216\u8CBC YouTube \u5F8C\u6309\u64AD\u653E\u4E26\u9078\u64C7\u5206\u9801\u97F3\u8A0A\u3002";
        return;
      }
    }
    const context = await ensureAudio();
    if (!mediaElementSource) {
      mediaElementSource = context.createMediaElementSource(mediaPlayer);
    }
    connectMediaAnalysis(mediaElementSource, context);
    try {
      await mediaPlayer.play();
      mediaStatus.textContent = "\u6B63\u5728\u5206\u6790\u5A92\u9AD4\u8072\u97F3\u4E26\u7522\u751F\u52D5\u614B\u97F3\u983B\u5716\u3002";
    } catch (error) {
      mediaStatus.textContent = `\u64AD\u653E\u5931\u6557\uFF1A${error.message}\u3002\u8ACB\u6539\u7528\u672C\u6A5F\u6A94\u6848\u6216\u53EF\u76F4\u63A5\u4E32\u6D41\u7684\u5A92\u9AD4\u6A94\u3002`;
    }
  });
  document.querySelector("#pauseMedia").addEventListener("click", () => {
    if (!mediaPlayer.hidden) mediaPlayer.pause();
  });
  document.querySelector("#captureTabAudio").addEventListener("click", async () => {
    try {
      await captureTabAudio();
    } catch (error) {
      mediaStatus.textContent = `\u7121\u6CD5\u64F7\u53D6\u5206\u9801\u97F3\u8A0A\uFF1A${error.message}`;
    }
  });
  function animateMedia() {
    if (mediaMode === "youtube") {
      drawIdle(canvases.media, ctxs.media, "\u6309\u64AD\u653E\u5F8C\u9078\u64C7 YouTube \u5206\u9801\u97F3\u8A0A");
    } else if ((mediaMode === "direct" || mediaMode === "capture") && mediaAnalyser) {
      const result = drawSpectrum(canvases.media, ctxs.media, mediaAnalyser, "media");
      document.querySelector("#beatEnergy").textContent = result.lowEnergy > 22e3 ? "\u5F37" : result.lowEnergy > 9e3 ? "\u4E2D" : "\u5F31";
      document.querySelector("#brightnessValue").textContent = result.highEnergy > 28e3 ? "\u660E\u4EAE" : result.highEnergy > 13e3 ? "\u666E\u901A" : "\u6EAB\u548C";
    } else {
      drawIdle(canvases.media, ctxs.media, "\u7B49\u5F85\u5A92\u9AD4\u64AD\u653E");
    }
    requestAnimationFrame(animateMedia);
  }
  function drawIdle(canvas, ctx, label) {
    drawGrid(ctx, canvas.width, canvas.height);
    ctx.fillStyle = "#a8b8cc";
    ctx.font = "24px Microsoft JhengHei, sans-serif";
    ctx.fillText(label, 28, 46);
  }
  function stopChallengeTone() {
    challengePlaybackRequest++;
    if (challengePlayback) {
      const { osc, gain, context } = challengePlayback;
      const now = context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, 5e-3);
      osc.stop(now + 0.03);
      challengePlayback = null;
    }
    document.querySelector("#stopChallenge").disabled = true;
    document.querySelector("#challengeStatus").textContent = "\u5DF2\u505C\u6B62\u64AD\u653E\uFF0C\u4ECD\u53EF\u9078\u64C7\u7B54\u6848\u6216\u91CD\u65B0\u51FA\u984C\u3002";
  }
  async function playChallengeTone(frequency) {
    stopChallengeTone();
    const request = challengePlaybackRequest;
    document.querySelector("#stopChallenge").disabled = false;
    document.querySelector("#challengeStatus").textContent = "\u6B63\u5728\u6E96\u5099\u8072\u97F3\u2026";
    try {
      const context = await ensureAudio();
      if (request !== challengePlaybackRequest) return;
      const osc = context.createOscillator();
      const gain = context.createGain();
      const compressor = context.createDynamicsCompressor();
      const baseVolume = Number(document.querySelector("#challengeVolume")?.value || 0.28);
      const compensation = frequency < 180 ? 1.45 : frequency > 7e3 ? 1.3 : 1;
      const volume = Math.min(0.72, baseVolume * compensation);
      osc.frequency.value = frequency;
      osc.type = "triangle";
      compressor.threshold.value = -16;
      compressor.knee.value = 18;
      compressor.ratio.value = 7;
      compressor.attack.value = 4e-3;
      compressor.release.value = 0.16;
      gain.gain.setValueAtTime(1e-4, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + 0.04);
      gain.gain.setValueAtTime(volume, context.currentTime + 5.9);
      gain.gain.exponentialRampToValueAtTime(1e-4, context.currentTime + 6);
      osc.connect(gain).connect(compressor).connect(context.destination);
      const playback = { osc, gain, context };
      challengePlayback = playback;
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
        compressor.disconnect();
        if (challengePlayback !== playback) return;
        challengePlayback = null;
        document.querySelector("#stopChallenge").disabled = true;
        document.querySelector("#challengeStatus").textContent = "\u64AD\u653E\u5B8C\u7562\uFF0C\u8ACB\u9078\u51FA\u4F60\u807D\u5230\u7684\u983B\u7387\u7BC4\u570D\u3002";
      };
      osc.start();
      osc.stop(context.currentTime + 6);
      document.querySelector("#challengeStatus").textContent = "\u64AD\u653E\u4E2D\u30FB6 \u79D2\u5F8C\u81EA\u52D5\u505C\u6B62\uFF0C\u4E5F\u53EF\u6309\u300C\u505C\u6B62\u300D\u3002";
    } catch (error) {
      if (request !== challengePlaybackRequest) return;
      stopChallengeTone();
      document.querySelector("#challengeStatus").textContent = `\u7121\u6CD5\u64AD\u653E\u8072\u97F3\uFF1A${error.message}\u3002\u8ACB\u91CD\u65B0\u51FA\u984C\u3002`;
    }
  }
  document.querySelector("#stopChallenge").addEventListener("click", stopChallengeTone);
  document.querySelector("#newChallenge").addEventListener("click", () => {
    const bank = [
      { key: "low", min: 80, max: 300 },
      { key: "mid", min: 300, max: 2e3 },
      { key: "high", min: 2e3, max: 9e3 },
      { key: "ultra", min: 9e3, max: 15e3 }
    ];
    const item = bank[Math.floor(Math.random() * bank.length)];
    const frequency = Math.round(item.min + Math.random() * (item.max - item.min));
    challengeAnswer = item.key;
    playChallengeTone(frequency);
    document.querySelector("#gameFeedback").textContent = "\u8ACB\u9078\u51FA\u4F60\u807D\u5230\u7684\u983B\u7387\u7BC4\u570D\u3002";
  });
  document.querySelector("#frequencyChoices").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || !challengeAnswer) return;
    document.querySelector("#gameFeedback").textContent = button.dataset.choice === challengeAnswer ? "\u7B54\u5C0D\u4E86\uFF01\u4F60\u7684\u8033\u6735\u6293\u5230\u983B\u7387\u7DDA\u7D22\u3002" : "\u518D\u8A66\u4E00\u6B21\u3002\u53EF\u4EE5\u6CE8\u610F\u8072\u97F3\u662F\u6C89\u3001\u6E05\u695A\u3001\u5C16\uFF0C\u9084\u662F\u5E7E\u4E4E\u807D\u4E0D\u5230\u3002";
  });
  var biologicalSounds = [
    { id: "dog", name: "\u72D7", group: "\u54FA\u4E73\u985E" },
    { id: "cat", name: "\u8C93", group: "\u54FA\u4E73\u985E" },
    { id: "frog", name: "\u9752\u86D9", group: "\u5169\u68F2\u985E" },
    { id: "cricket", name: "\u87CB\u87C0", group: "\u6606\u87F2" },
    { id: "bee", name: "\u871C\u8702", group: "\u6606\u87F2" },
    { id: "mosquito", name: "\u84BC\u8805", group: "\u6606\u87F2" },
    { id: "owl", name: "\u8C93\u982D\u9DF9", group: "\u9CE5\u985E" },
    { id: "dolphin", name: "\u6D77\u8C5A", group: "\u6D77\u6D0B\u54FA\u4E73\u985E" },
    { id: "whale", name: "\u9BE8\u9B5A", group: "\u6D77\u6D0B\u54FA\u4E73\u985E" },
    { id: "rooster", name: "\u516C\u96DE", group: "\u9CE5\u985E" },
    { id: "cow", name: "\u725B", group: "\u54FA\u4E73\u985E" },
    { id: "sheep", name: "\u7F8A", group: "\u54FA\u4E73\u985E" },
    { id: "horse", name: "\u99AC", group: "\u54FA\u4E73\u985E" },
    { id: "elephant", name: "\u5927\u8C61", group: "\u54FA\u4E73\u985E" },
    { id: "wolf", name: "\u72FC", group: "\u54FA\u4E73\u985E" },
    { id: "crow", name: "\u70CF\u9D09", group: "\u9CE5\u985E" },
    { id: "duck", name: "\u9D28\u5B50", group: "\u9CE5\u985E" },
    { id: "cicada", name: "\u87EC", group: "\u6606\u87F2" },
    { id: "monkey", name: "\u7334\u5B50", group: "\u54FA\u4E73\u985E" },
    { id: "pig", name: "\u8C6C", group: "\u54FA\u4E73\u985E" },
    { id: "snake", name: "\u86C7", group: "\u722C\u87F2\u985E" },
    { id: "goat", name: "\u5C71\u7F8A", group: "\u54FA\u4E73\u985E" }
  ];
  var bioVoiceHints = {
    dog: "\u6C6A \u6C6A",
    cat: "\u55B5 \u55DA",
    frog: "\u5471 \u5471",
    cricket: "\u5527 \u5527 \u5527",
    bee: "\u55E1 \u55E1",
    mosquito: "\u55EF \u55E1",
    owl: "\u547C \u547C",
    dolphin: "\u54BF \u54BF",
    whale: "\u55DA \u55DA",
    rooster: "\u5594 \u5594 \u557C",
    cow: "\u54DE",
    sheep: "\u54A9 \u54A9",
    horse: "\u5636 \u5636",
    elephant: "\u55DA \u54DE",
    wolf: "\u55F7 \u55DA",
    crow: "\u554A \u554A",
    duck: "\u560E \u560E",
    cicada: "\u77E5 \u4E86 \u77E5 \u4E86",
    monkey: "\u5431 \u5431",
    pig: "\u54FC \u54FC",
    snake: "\u5636 \u5636",
    goat: "\u54A9 \u6B38"
  };
  function speakBioHint(id) {
    if (!document.querySelector("#bioVoiceHint")?.checked || !("speechSynthesis" in window)) return;
    const text = bioVoiceHints[id];
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-TW";
    utterance.rate = 0.86;
    utterance.pitch = id === "elephant" || id === "cow" || id === "whale" ? 0.55 : id === "mosquito" || id === "cricket" || id === "cicada" ? 1.55 : 1.08;
    utterance.volume = Math.min(1, Math.max(0.35, Number(document.querySelector("#bioVolume")?.value || 1.7) / 2.4));
    bioHintTimer = setTimeout(() => window.speechSynthesis.speak(utterance), 130);
  }
  var bioManifest = {};
  var bioAudioEl;
  var bioMediaSource;
  var bioGainNode;
  var bioStopTimer;
  var bioHintTimer;
  var bioPlaybackRequest = 0;
  var bioReady = false;
  var bioDeck = [];
  var BIO_MAX_SECONDS = 5;
  async function loadBioManifest() {
    const button = document.querySelector("#newBioChallenge");
    button.disabled = true;
    try {
      if (isLocalFile) {
        bioManifest = bio_manifest_default;
      } else {
        const response = await fetch("./audio/bio/manifest.json");
        if (!response.ok) throw new Error(String(response.status));
        bioManifest = await response.json();
      }
      const known = new Set(biologicalSounds.map((item) => item.id));
      for (const [id, entry] of Object.entries(bioManifest)) {
        if (!known.has(id) && entry.name && entry.group && entry.file) {
          biologicalSounds.push({ id, name: entry.name, group: entry.group });
          known.add(id);
        }
      }
      if (biologicalSounds.some((item) => !bioManifest[item.id]?.file)) throw new Error("\u984C\u5EAB\u7F3A\u5C11\u9304\u97F3");
      bioReady = true;
      button.textContent = "\u96A8\u6A5F\u51FA\u984C";
      document.querySelector("#bioBankStatus").textContent = `\u984C\u5EAB\u5171 ${biologicalSounds.length} \u7A2E\u30FB\u65B0\u589E ${Object.values(bioManifest).filter((entry) => entry.addedOn).length} \u7A2E\u30FB\u540C\u4E00\u8F2A\u4E0D\u91CD\u8907\u51FA\u984C`;
    } catch {
      bioManifest = {};
      bioReady = false;
      button.textContent = "\u91CD\u65B0\u8F09\u5165\u984C\u5EAB";
      document.querySelector("#bioBankStatus").textContent = "\u984C\u5EAB\u8F09\u5165\u5931\u6557\uFF0C\u8ACB\u6309\u300C\u91CD\u65B0\u8F09\u5165\u984C\u5EAB\u300D\u518D\u8A66\u4E00\u6B21\u3002";
    }
    button.disabled = false;
    renderAudioCredits();
  }
  function renderAudioCredits() {
    const section = document.querySelector("#audioCredits");
    const list = document.querySelector("#audioCreditsList");
    if (!section || !list) return;
    const nameById = Object.fromEntries(biologicalSounds.map((item) => [item.id, item.name]));
    const entries = biologicalSounds.map((item) => ({ id: item.id, name: nameById[item.id], ...bioManifest[item.id] })).filter((entry) => entry.file);
    if (!entries.length) {
      section.hidden = true;
      return;
    }
    list.innerHTML = entries.map((entry) => {
      const title = (entry.src || entry.file).replace(/^File:/, "");
      const source = entry.sourcePage || entry.url ? `<a href="${escapeHtml(entry.sourcePage || entry.url)}" target="_blank" rel="noreferrer">${escapeHtml(title)}</a>` : title;
      const license = entry.licenseUrl ? `\uFF08<a href="${escapeHtml(entry.licenseUrl)}" target="_blank" rel="noreferrer">${escapeHtml(entry.license)}</a>\uFF09` : entry.license ? `\uFF08${escapeHtml(entry.license)}\uFF09` : "";
      const author = entry.artist ? `\uFF0C\u4F5C\u8005\uFF1A${escapeHtml(entry.artist)}` : "";
      const edits = entry.modifications ? `<br><small>${escapeHtml(entry.modifications)}</small>` : "";
      return `<li><strong>${escapeHtml(entry.name)}</strong>\uFF1A${source}${author}${license}${edits}</li>`;
    }).join("");
    section.hidden = false;
  }
  function bioVolume() {
    return Number(document.querySelector("#bioVolume")?.value || 1.7);
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }
  async function playRealBioSound(entry, request) {
    const context = await ensureAudio();
    if (request !== bioPlaybackRequest) return false;
    if (!bioAudioEl) {
      bioAudioEl = new Audio();
      bioAudioEl.preload = "auto";
      bioMediaSource = context.createMediaElementSource(bioAudioEl);
      bioGainNode = context.createGain();
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 20;
      compressor.ratio.value = 8;
      compressor.attack.value = 4e-3;
      compressor.release.value = 0.18;
      bioMediaSource.connect(bioGainNode).connect(compressor).connect(context.destination);
    }
    bioGainNode.gain.setTargetAtTime(bioVolume(), context.currentTime, 0.02);
    clearTimeout(bioStopTimer);
    bioAudioEl.pause();
    bioAudioEl.src = `./audio/bio/${entry.file}`;
    bioAudioEl.currentTime = 0;
    await bioAudioEl.play();
    if (request !== bioPlaybackRequest) return false;
    bioStopTimer = setTimeout(() => {
      if (request === bioPlaybackRequest) bioAudioEl.pause();
    }, BIO_MAX_SECONDS * 1e3);
    return true;
  }
  async function playBiologicalSound(id) {
    const request = ++bioPlaybackRequest;
    clearTimeout(bioStopTimer);
    clearTimeout(bioHintTimer);
    bioAudioEl?.pause();
    window.speechSynthesis?.cancel();
    const entry = bioManifest[id];
    try {
      if (!entry?.file) throw new Error("\u7F3A\u5C11\u771F\u5BE6\u9304\u97F3");
      if (await playRealBioSound(entry, request)) {
        if (document.querySelector("#bioFeedback").textContent.includes("\u66AB\u6642\u7121\u6CD5\u64AD\u653E")) {
          document.querySelector("#bioFeedback").textContent = `\u7B2C ${bioRound} \u984C\uFF1A\u4ED4\u7D30\u807D\uFF0C\u731C\u731C\u662F\u54EA\u4E00\u7A2E\u751F\u7269\u3002`;
        }
        speakBioHint(id);
      }
    } catch {
      if (request !== bioPlaybackRequest) return;
      document.querySelector("#bioFeedback").textContent = "\u9019\u6BB5\u771F\u5BE6\u9304\u97F3\u66AB\u6642\u7121\u6CD5\u64AD\u653E\uFF0C\u8ACB\u6309\u300C\u91CD\u64AD\u8072\u97F3\u300D\u6216\u91CD\u65B0\u51FA\u984C\u3002";
    }
  }
  function shuffled(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function pickOptions(answer) {
    const options = [answer];
    const pool = shuffled(biologicalSounds.filter((item) => item.id !== answer.id));
    options.push(...pool.slice(0, 3));
    return shuffled(options);
  }
  async function startBioChallenge() {
    if (!bioReady) {
      await loadBioManifest();
      if (!bioReady) return;
    }
    if (!bioDeck.length) {
      bioDeck = shuffled(biologicalSounds);
      if (bioDeck.at(-1)?.id === bioAnswer?.id) [bioDeck[0], bioDeck[bioDeck.length - 1]] = [bioDeck.at(-1), bioDeck[0]];
    }
    bioAnswer = bioDeck.pop();
    document.querySelector("#replayBioSound").disabled = false;
    bioRound += 1;
    document.querySelector("#bioRound").textContent = String(bioRound);
    document.querySelector("#bioGroup").textContent = bioAnswer.group;
    document.querySelector("#bioChoices").innerHTML = pickOptions(bioAnswer).map(
      (item) => `<button data-bio="${item.id}">${item.name}</button>`
    ).join("");
    document.querySelector("#bioFeedback").textContent = `\u7B2C ${bioRound} \u984C\uFF1A\u4ED4\u7D30\u807D\uFF0C\u731C\u731C\u662F\u54EA\u4E00\u7A2E\u751F\u7269\u3002`;
    playBiologicalSound(bioAnswer.id);
  }
  document.querySelector("#bioVolume").addEventListener("input", () => {
    if (bioGainNode && audioContext) {
      bioGainNode.gain.setTargetAtTime(bioVolume(), audioContext.currentTime, 0.03);
    }
  });
  document.querySelector("#newBioChallenge").addEventListener("click", startBioChallenge);
  document.querySelector("#replayBioSound").addEventListener("click", () => {
    if (!bioAnswer) {
      document.querySelector("#bioFeedback").textContent = "\u8ACB\u5148\u6309\u300C\u96A8\u6A5F\u51FA\u984C\u300D\u3002";
      return;
    }
    playBiologicalSound(bioAnswer.id);
  });
  document.querySelector("#bioChoices").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || !bioAnswer) return;
    const correct = button.dataset.bio === bioAnswer.id;
    if (correct) {
      bioScore += 1;
      document.querySelector("#bioScore").textContent = String(bioScore);
    }
    document.querySelector("#bioFeedback").textContent = correct ? `\u7B54\u5C0D\u4E86\uFF01\u9019\u662F\u300C${bioAnswer.name}\u300D\u7684\u8072\u97F3\u7DDA\u7D22\u3002` : `\u9084\u5DEE\u4E00\u9EDE\uFF0C\u7B54\u6848\u662F\u300C${bioAnswer.name}\u300D\u3002\u6309\u300C\u96A8\u6A5F\u51FA\u984C\u300D\u518D\u6311\u6230\u3002`;
    [...document.querySelectorAll("#bioChoices button")].forEach((choice) => {
      choice.disabled = true;
      if (choice.dataset.bio === bioAnswer.id) choice.classList.add("primary-action");
    });
  });
  function miniSvg(type) {
    const common = 'viewBox="0 0 320 180" role="img"';
    const map = {
      frequency: `<svg ${common} aria-label="\u983B\u7387\u6BD4\u8F03"><rect width="320" height="180" fill="#0b1421"/><path d="M18 96 C58 38 98 38 138 96 S218 154 302 96" fill="none" stroke="#18b6a2" stroke-width="7"/><path d="M18 48 C30 28 42 28 54 48 S78 68 90 48 S114 28 126 48 S150 68 162 48 S186 28 198 48 S222 68 234 48 S258 28 270 48 S294 68 306 48" fill="none" stroke="#ffbf3f" stroke-width="5"/></svg>`,
      amplitude: `<svg ${common} aria-label="\u632F\u5E45\u6BD4\u8F03"><rect width="320" height="180" fill="#0b1421"/><path d="M18 90 C58 72 98 72 138 90 S218 108 302 90" fill="none" stroke="#4e8cff" stroke-width="5"/><path d="M18 92 C58 22 98 22 138 92 S218 158 302 92" fill="none" stroke="#ff5d93" stroke-width="7"/></svg>`,
      spectrum: `<svg ${common} aria-label="\u983B\u8B5C\u67F1\u72C0\u5716"><rect width="320" height="180" fill="#0b1421"/><g fill="#18b6a2"><rect x="34" y="92" width="22" height="58"/><rect x="70" y="54" width="22" height="96"/><rect x="106" y="78" width="22" height="72"/><rect x="142" y="30" width="22" height="120"/><rect x="178" y="62" width="22" height="88"/><rect x="214" y="104" width="22" height="46"/><rect x="250" y="86" width="22" height="64"/></g></svg>`,
      tuning: `<svg ${common} aria-label="\u8ABF\u97F3\u53C9"><rect width="320" height="180" fill="#0b1421"/><g class="tuning-fork"><path d="M142 34 V96 Q142 122 160 122 Q178 122 178 96 V34" fill="none" stroke="#ffbf3f" stroke-width="12" stroke-linecap="round"/><path d="M160 122 V154" stroke="#ffbf3f" stroke-width="12" stroke-linecap="round"/></g><path class="tuning-wave" d="M88 62 C110 42 124 42 136 62M184 62 C206 42 220 42 242 62" fill="none" stroke="#18b6a2" stroke-width="4"/></svg>`,
      noise: `<svg ${common} aria-label="\u566A\u97F3\u8A08"><rect width="320" height="180" fill="#0b1421"/><rect x="94" y="48" width="132" height="76" rx="12" fill="#142234" stroke="#4e8cff"/><text class="noise-text" x="124" y="96" fill="#e9f2ff" font-size="30">72 dB</text><path class="noise-bar" d="M74 138 H246" stroke="#ff5d93" stroke-width="10" stroke-linecap="round"/></svg>`,
      speech: `<svg ${common} aria-label="\u8A9E\u97F3\u6CE2\u5F62"><rect width="320" height="180" fill="#0b1421"/><path class="speech-wave" d="M34 92 Q58 40 82 92 T130 92 T178 92 T226 92 T286 92" fill="none" stroke="#18b6a2" stroke-width="6"/><circle class="speech-dot" cx="82" cy="92" r="8" fill="#ffbf3f"/><circle class="speech-dot speech-dot-2" cx="178" cy="92" r="8" fill="#ffbf3f"/></svg>`,
      visualizer: `<svg ${common} aria-label="\u97F3\u6A02\u8996\u89BA\u5316"><rect width="320" height="180" fill="#0b1421"/><circle class="viz-ring" cx="160" cy="90" r="44" fill="none" stroke="#4e8cff" stroke-width="10"/><circle class="viz-ring viz-ring-2" cx="160" cy="90" r="72" fill="none" stroke="#18b6a2" stroke-width="4"/><g fill="#ffbf3f"><rect class="viz-bar" x="42" y="92" width="18" height="54"/><rect class="viz-bar viz-bar-2" x="70" y="64" width="18" height="82"/><rect class="viz-bar viz-bar-3" x="232" y="74" width="18" height="72"/><rect class="viz-bar viz-bar-4" x="260" y="102" width="18" height="44"/></g></svg>`,
      ultrasound: `<svg ${common} aria-label="\u8D85\u97F3\u6CE2\u6E2C\u8DDD"><rect width="320" height="180" fill="#0b1421"/><rect x="42" y="68" width="58" height="44" rx="8" fill="#142234" stroke="#18b6a2"/><g class="sonar"><path class="sonar-wave" d="M108 74 C150 42 188 42 228 74" fill="none" stroke="#ffbf3f" stroke-width="4"/><path class="sonar-wave sonar-wave-2" d="M108 92 C158 66 190 66 228 92" fill="none" stroke="#ffbf3f" stroke-width="4"/><path class="sonar-wave sonar-wave-3" d="M108 110 C150 138 188 138 228 110" fill="none" stroke="#ffbf3f" stroke-width="4"/></g><rect x="242" y="46" width="34" height="88" rx="6" fill="#4e8cff"/></svg>`,
      insulation: `<svg ${common} aria-label="\u9694\u97F3\u6750\u6599"><rect width="320" height="180" fill="#0b1421"/><path class="insul-in" d="M40 90 C66 48 92 48 118 90 S170 132 196 90" fill="none" stroke="#ff5d93" stroke-width="5"/><rect x="202" y="36" width="32" height="118" fill="#18b6a2"/><rect x="244" y="36" width="32" height="118" fill="#4e8cff"/><path class="insul-out" d="M236 90 C250 78 260 78 276 90" fill="none" stroke="#a8b8cc" stroke-width="4"/></svg>`
    };
    return map[type] || map.spectrum;
  }
  function conceptDemoMarkup(item) {
    const controls = {
      frequency: `
      <div class="demo-controls">
        <label>\u983B\u7387 <output class="demo-out">300 Hz</output></label>
        <input type="range" class="demo-freq" min="80" max="1200" step="10" value="300" aria-label="\u983B\u7387" />
        <button type="button" class="demo-play">\u25B6 \u8A66\u807D</button>
      </div>`,
      amplitude: `
      <div class="demo-controls">
        <label>\u632F\u5E45 <output class="demo-out">50%</output></label>
        <input type="range" class="demo-amp" min="0" max="1" step="0.02" value="0.5" aria-label="\u632F\u5E45" />
        <button type="button" class="demo-play">\u25B6 \u8A66\u807D</button>
      </div>`,
      spectrum: `
      <div class="demo-controls">
        <div class="demo-presets">
          <button type="button" data-fp="bass" class="active">\u4F4E\u97F3\u9F13</button>
          <button type="button" data-fp="voice">\u4EBA\u8072</button>
          <button type="button" data-fp="bird">\u9CE5\u9CF4</button>
          <button type="button" data-fp="noise">\u767D\u566A\u97F3</button>
        </div>
      </div>`
    };
    const extra = controls[item.visual] || "";
    return `<article class="concept-card demo-card" data-demo="${item.visual}">
    <div class="demo-stage"><canvas class="demo-canvas" width="660" height="240"></canvas></div>
    ${extra}
    <h3>${item.title}</h3>
    <p>${item.text}</p>
  </article>`;
  }
  function playDemoTone(frequency, amplitude = 0.5, seconds = 0.7) {
    ensureAudio().then((context) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const compressor = context.createDynamicsCompressor();
      const volume = Math.min(0.55, 0.05 + amplitude * 0.5);
      osc.type = "sine";
      osc.frequency.value = Math.max(1, frequency);
      compressor.threshold.value = -16;
      compressor.knee.value = 18;
      compressor.ratio.value = 7;
      gain.gain.setValueAtTime(1e-4, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(Math.max(2e-4, volume), context.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(1e-4, context.currentTime + seconds);
      osc.connect(gain).connect(compressor).connect(context.destination);
      osc.start();
      osc.stop(context.currentTime + seconds + 0.05);
    });
  }
  var conceptDemos = [];
  var SPECTRUM_BARS = 28;
  function spectrumTarget(profile, i, n) {
    const x = i / (n - 1);
    switch (profile) {
      case "bass":
        return Math.exp(-i / 3.2) * 0.95 + 0.05;
      case "voice": {
        const g = (c, w) => Math.exp(-((x - c) ** 2) / (2 * w * w));
        return Math.min(1, g(0.12, 0.06) * 0.95 + g(0.34, 0.09) * 0.7 + g(0.6, 0.12) * 0.35 + 0.04);
      }
      case "bird":
        return Math.exp(-(n - 1 - i) / 3.4) * 0.95 + 0.05;
      case "noise":
        return 0.5 + 0.12 * Math.sin(i * 1.7);
      default:
        return 0.4;
    }
  }
  function initInteractiveConcepts() {
    conceptDemos.length = 0;
    document.querySelectorAll("#conceptGrid .demo-card").forEach((card) => {
      const canvas = card.querySelector(".demo-canvas");
      const state = { type: card.dataset.demo, card, canvas, ctx: canvas.getContext("2d"), phase: 0 };
      if (state.type === "frequency") {
        const range = card.querySelector(".demo-freq");
        const out = card.querySelector(".demo-out");
        state.freq = Number(range.value);
        range.addEventListener("input", () => {
          state.freq = Number(range.value);
          out.textContent = `${state.freq} Hz`;
        });
        card.querySelector(".demo-play").addEventListener("click", () => playDemoTone(state.freq, 0.5, 0.8));
      } else if (state.type === "amplitude") {
        const range = card.querySelector(".demo-amp");
        const out = card.querySelector(".demo-out");
        state.amp = Number(range.value);
        range.addEventListener("input", () => {
          state.amp = Number(range.value);
          out.textContent = `${Math.round(state.amp * 100)}%`;
        });
        card.querySelector(".demo-play").addEventListener("click", () => playDemoTone(440, state.amp, 0.7));
      } else if (state.type === "spectrum") {
        state.profile = "bass";
        state.bars = new Array(SPECTRUM_BARS).fill(0.1);
        state.seeds = Array.from({ length: SPECTRUM_BARS }, () => Math.random() * Math.PI * 2);
        card.querySelectorAll(".demo-presets button").forEach((button) => {
          button.addEventListener("click", () => {
            state.profile = button.dataset.fp;
            card.querySelectorAll(".demo-presets button").forEach((b) => b.classList.toggle("active", b === button));
          });
        });
      }
      conceptDemos.push(state);
    });
    if (conceptDemos.length && !conceptDemos.running) {
      conceptDemos.running = true;
      requestAnimationFrame(animateConcepts);
    }
  }
  function animateConcepts() {
    conceptDemos.forEach(drawConceptDemo);
    requestAnimationFrame(animateConcepts);
  }
  function drawConceptDemo(state) {
    const { ctx, canvas } = state;
    if (canvas.offsetParent === null) return;
    const w = canvas.width;
    const h = canvas.height;
    drawGrid(ctx, w, h);
    if (state.type === "frequency") {
      state.phase += 0.05;
      const cycles = Math.max(0.6, Math.min(26, state.freq / 60));
      const hue = state.freq > 700 ? 45 : state.freq > 320 ? 200 : 168;
      ctx.lineWidth = 4;
      ctx.strokeStyle = `hsl(${hue}, 82%, 62%)`;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const y = h / 2 + Math.sin(x / w * cycles * Math.PI * 2 - state.phase) * 72;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = "#e9f2ff";
      ctx.font = "22px Microsoft JhengHei, sans-serif";
      ctx.fillText(`${state.freq} Hz`, 24, 38);
      ctx.fillStyle = "#a8b8cc";
      ctx.font = "18px Microsoft JhengHei, sans-serif";
      ctx.fillText(state.freq < 320 ? "\u4F4E\u6C89" : state.freq < 700 ? "\u9069\u4E2D" : "\u5C16\u4EAE", w - 92, 38);
    } else if (state.type === "amplitude") {
      state.phase += 0.05;
      const amp = state.amp * (h * 0.42);
      ctx.setLineDash([6, 8]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(168, 184, 204, 0.5)";
      [h / 2 - h * 0.42, h / 2 + h * 0.42].forEach((y) => {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = state.amp > 0.66 ? "#ff5d93" : state.amp > 0.33 ? "#ffbf3f" : "#18b6a2";
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const y = h / 2 + Math.sin(x / w * 4 * Math.PI * 2 - state.phase) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = "#e9f2ff";
      ctx.font = "22px Microsoft JhengHei, sans-serif";
      ctx.fillText(`\u632F\u5E45 ${Math.round(state.amp * 100)}%`, 24, 38);
      ctx.fillStyle = "#a8b8cc";
      ctx.font = "18px Microsoft JhengHei, sans-serif";
      ctx.fillText(state.amp > 0.66 ? "\u5927\u8072" : state.amp > 0.33 ? "\u9069\u4E2D" : "\u5C0F\u8072", w - 70, 38);
    } else if (state.type === "spectrum") {
      state.phase += 0.06;
      const n = state.bars.length;
      const barWidth = w / n;
      for (let i = 0; i < n; i += 1) {
        const base = spectrumTarget(state.profile, i, n);
        const wobble = 0.78 + 0.22 * Math.sin(state.phase * 2 + state.seeds[i]);
        const target = Math.max(0.04, Math.min(1, base * wobble));
        state.bars[i] += (target - state.bars[i]) * 0.18;
        const barHeight = state.bars[i] * h * 0.82;
        const hue = 170 - i / n * 120;
        ctx.fillStyle = `hsl(${hue}, 84%, ${46 + state.bars[i] * 20}%)`;
        ctx.fillRect(i * barWidth + 1, h - barHeight, Math.max(1, barWidth - 3), barHeight);
      }
      ctx.fillStyle = "#e9f2ff";
      ctx.font = "20px Microsoft JhengHei, sans-serif";
      const label = { bass: "\u4F4E\u97F3\u9F13\uFF1A\u4F4E\u983B\u5F37", voice: "\u4EBA\u8072\uFF1A\u4E2D\u4F4E\u983B\u805A\u96C6", bird: "\u9CE5\u9CF4\uFF1A\u9AD8\u983B\u5F37", noise: "\u767D\u566A\u97F3\uFF1A\u5404\u983B\u5747\u52FB" }[state.profile] || "";
      ctx.fillText(label, 24, 32);
    }
  }
  var resourceSlugMap = {
    "phet.colorado.edu": "phet",
    "pedia.cloud.edu.tw": "pedia",
    "www.cwa.gov.tw": "cwa",
    "www.cdc.gov": "cdc",
    "developer.mozilla.org": "mdn",
    "www.sciencelearn.org.nz": "sciencelearn"
  };
  function resourceSlug(url) {
    try {
      const host = new URL(url).hostname;
      return resourceSlugMap[host] || host.replace(/^www\./, "").split(".")[0];
    } catch {
      return "";
    }
  }
  async function loadResourceLogos() {
    if (isLocalFile) return resource_logos_default;
    try {
      const response = await fetch("./img/resources/manifest.json");
      if (!response.ok) throw new Error(String(response.status));
      return await response.json();
    } catch {
      return {};
    }
  }
  function resourceVisual(item, logos) {
    const slug = resourceSlug(item.url);
    const entry = logos[slug];
    if (entry?.logo) {
      return `<div class="resource-logo"><img src="./img/resources/${entry.logo}" alt="${item.title} \u6A19\u8A8C" loading="lazy" /></div>`;
    }
    return miniSvg("spectrum");
  }
  async function loadContent() {
    try {
      const loadJson = async (path, localFallback) => {
        if (isLocalFile) return localFallback;
        const response = await fetch(path);
        if (!response.ok) throw new Error(`${path} ${response.status}`);
        return response.json();
      };
      const [content, quiz, resources] = await Promise.all([
        loadJson("./data/content.json", content_default),
        loadJson("./data/quiz.json", quiz_default),
        loadJson("./data/resources.json", resources_default)
      ]);
      document.querySelector("#conceptGrid").innerHTML = content.concepts.map(
        (item) => conceptDemoMarkup(item)
      ).join("");
      initInteractiveConcepts();
      document.querySelector("#applicationGrid").innerHTML = content.applications.map((item) => `
      <article class="concept-card">${miniSvg(item.visual)}<h3>${item.title}</h3><p>${item.text}</p></article>
    `).join("");
      const resourceLogos = await loadResourceLogos();
      document.querySelector("#resourceGrid").innerHTML = resources.map((item) => `
      <article class="resource-card">
        ${resourceVisual(item, resourceLogos)}
        <h3><a href="${item.url}" target="_blank" rel="noreferrer">${item.title}</a></h3>
        <p>${item.description}</p>
        <p class="resource-meta">${item.type}\uFF5C${item.grade}\uFF5C\u6AA2\u67E5\u65E5\u671F ${item.checkedAt}</p>
      </article>
    `).join("");
      renderQuiz(quiz);
    } catch (error) {
      const message = `<article class="concept-card"><h3>\u8CC7\u6599\u8F09\u5165\u5931\u6557</h3><p>\u8ACB\u91CD\u65B0\u6574\u7406\u9801\u9762\uFF0C\u6216\u78BA\u8A8D data \u8CC7\u6599\u6A94\u5DF2\u90E8\u7F72\u3002\u932F\u8AA4\uFF1A${error.message}</p></article>`;
      document.querySelector("#conceptGrid").innerHTML = message;
      document.querySelector("#applicationGrid").innerHTML = "";
      document.querySelector("#resourceGrid").innerHTML = message;
      document.querySelector("#quizBox").innerHTML = message;
    }
  }
  function renderQuiz(quiz) {
    quizQuestions = quiz;
    resetQuiz();
  }
  function quizOptionLabel(index) {
    return String.fromCharCode(65 + index);
  }
  function updateQuizHeader() {
    const total = quizQuestions.length;
    document.querySelector("#quizScore").textContent = `\u7B54\u5C0D ${quizCorrect} / ${total}`;
    document.querySelector("#quizProgress").textContent = total ? `\u7B2C ${quizIndex + 1} / ${total} \u984C` : "\u6E96\u5099\u4E2D\u2026";
    document.querySelector("#quizQuestionProgress").style.width = total ? `${(quizIndex + 1) / total * 100}%` : "0%";
  }
  function renderQuizQuestion({ focus = false } = {}) {
    const box = document.querySelector("#quizBox");
    const feedback = document.querySelector("#quizFeedback");
    const nextButton = document.querySelector("#nextQuiz");
    const item = quizQuestions[quizIndex];
    if (!item) {
      box.innerHTML = `<div class="quiz-result" tabindex="-1">
      <p class="quiz-result-icon" aria-hidden="true">\u{1F3C1}</p>
      <h3>\u6311\u6230\u5B8C\u6210\uFF01</h3>
      <p>\u4F60\u7B54\u5C0D\u4E86 <strong>${quizCorrect}</strong> \u984C\uFF0C\u5171 ${quizQuestions.length} \u984C\u3002</p>
      <p>${quizCorrect === quizQuestions.length ? "\u592A\u68D2\u4E86\uFF0C\u6BCF\u984C\u90FD\u7B54\u5C0D\uFF01" : "\u53EF\u4EE5\u6309\u300C\u91CD\u65B0\u6311\u6230\u300D\u518D\u8907\u7FD2\u4E00\u6B21\u3002"}</p>
    </div>`;
      document.querySelector("#quizProgress").textContent = `\u5DF2\u5B8C\u6210 ${quizQuestions.length} / ${quizQuestions.length} \u984C`;
      document.querySelector("#quizQuestionProgress").style.width = "100%";
      feedback.textContent = `\u6311\u6230\u5B8C\u6210\uFF0C\u5171\u7B54\u5C0D ${quizCorrect} \u984C\u3002`;
      feedback.dataset.state = "complete";
      nextButton.hidden = true;
      if (focus) box.querySelector(".quiz-result")?.focus();
      return;
    }
    quizAnswered = false;
    updateQuizHeader();
    box.innerHTML = `
    <div class="quiz-item" data-answer="${item.answer}">
      <h3 id="currentQuizQuestion" class="quiz-question" tabindex="-1">${quizIndex + 1}. ${item.question}</h3>
      <div class="quiz-options" role="group" aria-labelledby="currentQuizQuestion">
        ${item.options.map((option, optionIndex) => `
          <button class="quiz-option" type="button" data-option="${optionIndex}">
            <span class="quiz-option-letter" aria-hidden="true">${quizOptionLabel(optionIndex)}</span>
            <span class="quiz-option-text">${option}</span>
          </button>
        `).join("")}
      </div>
    </div>`;
    box.querySelectorAll(".quiz-option").forEach((button) => {
      button.addEventListener("click", () => answerQuizQuestion(Number(button.dataset.option)));
    });
    feedback.textContent = "\u8ACB\u9078\u64C7\u4E00\u500B\u7B54\u6848\u3002";
    feedback.dataset.state = "waiting";
    nextButton.hidden = false;
    nextButton.disabled = true;
    nextButton.textContent = quizIndex === quizQuestions.length - 1 ? "\u67E5\u770B\u6210\u7E3E" : "\u4E0B\u4E00\u984C";
    if (focus) document.querySelector("#currentQuizQuestion")?.focus({ preventScroll: true });
  }
  function playApplause(context) {
    const duration = 1.35;
    const frameCount = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i += 1) data[i] = Math.random() * 2 - 1;
    const now = context.currentTime;
    [0, 0.11, 0.23, 0.36, 0.51, 0.68, 0.87].forEach((offset, index) => {
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      source.buffer = buffer;
      filter.type = "bandpass";
      filter.frequency.value = 1050 + index % 3 * 420;
      filter.Q.value = 0.65;
      gain.gain.setValueAtTime(1e-4, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.18 + index % 2 * 0.04, now + offset + 0.018);
      gain.gain.exponentialRampToValueAtTime(1e-4, now + offset + 0.18);
      source.connect(filter).connect(gain).connect(context.destination);
      source.start(now + offset, Math.min(offset, 0.6), 0.2);
    });
  }
  function playIncorrectSound(context) {
    const now = context.currentTime;
    [0, 0.24].forEach((offset, index) => {
      const oscillatorNode = context.createOscillator();
      const gain = context.createGain();
      oscillatorNode.type = "triangle";
      oscillatorNode.frequency.setValueAtTime(index === 0 ? 260 : 175, now + offset);
      gain.gain.setValueAtTime(1e-4, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.16, now + offset + 0.025);
      gain.gain.exponentialRampToValueAtTime(1e-4, now + offset + 0.22);
      oscillatorNode.connect(gain).connect(context.destination);
      oscillatorNode.start(now + offset);
      oscillatorNode.stop(now + offset + 0.24);
    });
  }
  function speakQuizResult(message, delay) {
    if (!("speechSynthesis" in window)) return;
    clearTimeout(quizSpeechTimer);
    window.speechSynthesis.cancel();
    quizSpeechTimer = setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = "zh-TW";
      utterance.rate = 0.92;
      utterance.pitch = 1.05;
      const voices = window.speechSynthesis.getVoices();
      utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === "zh-tw") || voices.find((voice) => voice.lang.toLowerCase().startsWith("zh")) || null;
      window.speechSynthesis.speak(utterance);
    }, delay);
  }
  async function playQuizFeedback(correct) {
    try {
      const context = await ensureAudio();
      if (correct) playApplause(context);
      else playIncorrectSound(context);
    } catch (error) {
      console.warn("\u7121\u6CD5\u64AD\u653E\u95D6\u95DC\u97F3\u6548\uFF1A", error);
    }
    speakQuizResult(correct ? "\u4F60\u7B54\u5C0D\u4E86" : "\u4F60\u7B54\u932F\u4E86", correct ? 480 : 360);
  }
  function answerQuizQuestion(selectedIndex) {
    if (quizAnswered) return;
    quizAnswered = true;
    const item = quizQuestions[quizIndex];
    const correct = selectedIndex === Number(item.answer);
    const options = [...document.querySelectorAll(".quiz-option")];
    const feedback = document.querySelector("#quizFeedback");
    if (correct) quizCorrect += 1;
    options.forEach((button, index) => {
      button.disabled = true;
      if (index === Number(item.answer)) {
        button.classList.add("correct-answer");
        button.setAttribute("aria-label", `${button.querySelector(".quiz-option-text").textContent}\uFF0C\u6B63\u78BA\u7B54\u6848`);
        button.insertAdjacentHTML("beforeend", '<span class="answer-badge">\u6B63\u78BA\u7B54\u6848</span>');
      }
      if (index === selectedIndex && !correct) button.classList.add("wrong-answer");
    });
    feedback.textContent = correct ? `\u4F60\u7B54\u5C0D\u4E86\uFF01${item.explanation}` : `\u4F60\u7B54\u932F\u4E86\u3002\u6B63\u78BA\u7B54\u6848\u662F\u300C${item.options[item.answer]}\u300D\u3002${item.explanation}`;
    feedback.dataset.state = correct ? "correct" : "wrong";
    document.querySelector("#nextQuiz").disabled = false;
    updateQuizHeader();
    playQuizFeedback(correct);
  }
  function resetQuiz() {
    quizIndex = 0;
    quizCorrect = 0;
    quizAnswered = false;
    clearTimeout(quizSpeechTimer);
    window.speechSynthesis?.cancel();
    renderQuizQuestion();
  }
  document.querySelector("#nextQuiz").addEventListener("click", () => {
    if (!quizAnswered) return;
    quizIndex += 1;
    renderQuizQuestion({ focus: true });
  });
  document.querySelector("#resetQuiz").addEventListener("click", resetQuiz);
  var quizFullscreenButton = document.querySelector("#quizFullscreen");
  var quizShell = document.querySelector(".quiz-shell");
  if (!document.fullscreenEnabled) quizFullscreenButton.hidden = true;
  quizFullscreenButton.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement === quizShell) await document.exitFullscreen();
      else await quizShell.requestFullscreen();
    } catch (error) {
      console.warn("\u7121\u6CD5\u5207\u63DB\u5168\u87A2\u5E55\uFF1A", error);
    }
  });
  document.addEventListener("fullscreenchange", () => {
    const active = document.fullscreenElement === quizShell;
    quizFullscreenButton.setAttribute("aria-pressed", String(active));
    quizFullscreenButton.textContent = active ? "\u26F6 \u96E2\u958B\u5168\u87A2\u5E55" : "\u26F6 \u5168\u87A2\u5E55\u4F5C\u7B54";
  });
  loadContent();
  loadBioManifest();
  loadMicDevices().catch(() => {
  });
  updateProgress();
  drawToneWave();
  animateMic();
  animateMedia();
  updateToneLabels();
})();
