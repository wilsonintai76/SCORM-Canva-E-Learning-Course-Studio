import { CourseManifest } from '../types/schema';

/**
 * Builds standalone, zero-dependency SCORM 1.2 HTML5 runtime package
 */
export function generateStandalonePlayerHtml(manifest: CourseManifest): string {
  const courseJson = JSON.stringify(manifest).replace(/<\/script>/gi, '<\\/script>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${manifest.title || 'SCORM Course'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body, html {
      width: 100%;
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f172a;
      color: #f8fafc;
      user-select: none;
    }
    #app-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      position: relative;
    }
    header {
      height: 54px;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      z-index: 10;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-title {
      font-size: 15px;
      font-weight: 600;
      color: #f1f5f9;
      max-width: 400px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 9999px;
      background: #3b82f6;
      color: white;
    }
    .badge-status {
      background: #0284c7;
    }
    .badge-passed {
      background: #10b981;
    }
    .badge-failed {
      background: #ef4444;
    }
    .progress-bar-container {
      flex: 1;
      max-width: 240px;
      margin: 0 16px;
      height: 6px;
      background: #334155;
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: #3b82f6;
      width: 0%;
      transition: width 0.3s ease;
    }
    #viewport {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #090d16;
      position: relative;
      overflow: hidden;
      padding: 16px;
    }
    #slide-stage {
      position: relative;
      background: #ffffff;
      color: #0f172a;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
      border-radius: 8px;
      overflow: hidden;
      transform-origin: center center;
    }
    .node-element {
      position: absolute;
      overflow: hidden;
    }
    .quiz-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    .quiz-question {
      font-size: 18px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 16px;
    }
    .quiz-options {
      display: flex;
      flex-direction: column;
      gap: 10px;
      flex: 1;
    }
    .quiz-option-btn {
      padding: 12px 16px;
      border-radius: 8px;
      border: 1.5px solid #cbd5e1;
      background: #f8fafc;
      color: #1e293b;
      font-size: 14px;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .quiz-option-btn:hover:not(:disabled) {
      border-color: #3b82f6;
      background: #eff6ff;
    }
    .quiz-option-btn.selected {
      border-color: #3b82f6;
      background: #dbeafe;
      font-weight: 500;
    }
    .quiz-option-btn.correct {
      border-color: #10b981;
      background: #d1fae5;
      color: #065f46;
    }
    .quiz-option-btn.incorrect {
      border-color: #ef4444;
      background: #fee2e2;
      color: #991b1b;
    }
    .quiz-feedback {
      margin-top: 12px;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 13px;
      display: none;
    }
    .quiz-feedback.show-correct {
      display: block;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .quiz-feedback.show-incorrect {
      display: block;
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    footer {
      height: 60px;
      background: #1e293b;
      border-top: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
    }
    .nav-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    }
    .nav-btn:hover:not(:disabled) {
      background: #2563eb;
    }
    .nav-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .nav-btn-secondary {
      background: #334155;
    }
    .nav-btn-secondary:hover:not(:disabled) {
      background: #475569;
    }
    .page-indicator {
      font-size: 13px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div id="app-container">
    <header>
      <div class="header-left">
        <span class="badge">SCORM 1.2</span>
        <div class="header-title" id="course-title">Loading...</div>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar-fill" id="progress-bar"></div>
      </div>
      <div class="header-left">
        <span class="badge badge-status" id="status-badge">Incomplete</span>
        <span class="badge" style="background:#475569;" id="score-badge">Score: 0%</span>
      </div>
    </header>

    <div id="viewport">
      <div id="slide-stage"></div>
    </div>

    <footer>
      <button class="nav-btn nav-btn-secondary" id="btn-prev">&larr; Previous</button>
      <div class="page-indicator" id="page-counter">Slide 1 of 1</div>
      <button class="nav-btn" id="btn-next">Next &rarr;</button>
    </footer>
  </div>

  <script id="course-manifest" type="application/json">
    ${courseJson}
  </script>

  <script>
    (function() {
      // SCORM 1.2 API Discovery
      function findScormApi(win) {
        var attempts = 0;
        while (win && attempts < 50) {
          try {
            if (win.API) return win.API;
          } catch(e) { break; }
          if (win.parent && win.parent !== win) {
            win = win.parent;
          } else if (win.opener) {
            try { if (win.opener.API) return win.opener.API; } catch(e){}
            break;
          } else {
            break;
          }
          attempts++;
        }
        return null;
      }

      var api = findScormApi(window);
      var scormActive = false;
      var startTime = Date.now();

      function formatTime(ms) {
        var totalSec = Math.floor(ms / 1000);
        var hundredths = Math.floor((ms % 1000) / 10);
        var h = Math.floor(totalSec / 3600);
        var m = Math.floor((totalSec % 3600) / 60);
        var s = totalSec % 60;
        function pad(n, w) {
          var str = String(n);
          while (str.length < (w || 2)) str = '0' + str;
          return str;
        }
        return pad(h, 4) + ':' + pad(m, 2) + ':' + pad(s, 2) + '.' + pad(hundredths, 2);
      }

      if (api) {
        scormActive = (api.LMSInitialize("") === "true");
        if (scormActive) {
          var curr = api.LMSGetValue("cmi.core.lesson_status");
          if (!curr || curr === "not attempted") {
            api.LMSSetValue("cmi.core.lesson_status", "incomplete");
            api.LMSCommit("");
          }
        }
      }

      window.addEventListener("beforeunload", function() {
        if (scormActive && api) {
          var dur = Date.now() - startTime;
          api.LMSSetValue("cmi.core.session_time", formatTime(dur));
          api.LMSCommit("");
          api.LMSFinish("");
        }
      });

      // Manifest data
      var manifestRaw = document.getElementById("course-manifest").textContent;
      var manifest = JSON.parse(manifestRaw);
      var pages = manifest.pages || [];
      var stageWidth = manifest.canvasWidth || 960;
      var stageHeight = manifest.canvasHeight || 540;
      var passingScore = manifest.passingScore || 80;

      var currentIndex = 0;
      var quizAnswers = {};
      var quizScores = {};

      // Restore bookmark from suspend_data or lesson_location if available
      if (scormActive && api) {
        var loc = api.LMSGetValue("cmi.core.lesson_location");
        if (loc) {
          var parsedIdx = parseInt(loc, 10);
          if (!isNaN(parsedIdx) && parsedIdx >= 0 && parsedIdx < pages.length) {
            currentIndex = parsedIdx;
          }
        }
        var susp = api.LMSGetValue("cmi.suspend_data");
        if (susp) {
          try {
            var sObj = JSON.parse(susp);
            if (sObj.quizAnswers) quizAnswers = sObj.quizAnswers;
            if (sObj.quizScores) quizScores = sObj.quizScores;
          } catch(e){}
        }
      }

      var elTitle = document.getElementById("course-title");
      var elStage = document.getElementById("slide-stage");
      var elPrev = document.getElementById("btn-prev");
      var elNext = document.getElementById("btn-next");
      var elPageCounter = document.getElementById("page-counter");
      var elProgressBar = document.getElementById("progress-bar");
      var elStatusBadge = document.getElementById("status-badge");
      var elScoreBadge = document.getElementById("score-badge");

      elTitle.textContent = manifest.title || "Interactive Course";
      elStage.style.width = stageWidth + "px";
      elStage.style.height = stageHeight + "px";

      function scaleStage() {
        var viewport = document.getElementById("viewport");
        var vw = viewport.clientWidth - 32;
        var vh = viewport.clientHeight - 32;
        var scale = Math.min(vw / stageWidth, vh / stageHeight, 1.25);
        scale = Math.max(scale, 0.25);
        elStage.style.transform = "scale(" + scale + ")";
      }
      window.addEventListener("resize", scaleStage);

      function calculateScores() {
        var totalPossible = 0;
        var totalEarned = 0;
        pages.forEach(function(p) {
          (p.nodes || []).forEach(function(n) {
            if (n.type === 'quiz') {
              var pts = n.points || 10;
              totalPossible += pts;
              if (quizScores[n.id]) {
                totalEarned += quizScores[n.id];
              }
            }
          });
        });

        var pct = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 100;
        return { totalEarned: totalEarned, totalPossible: totalPossible, pct: pct };
      }

      function updateScormState() {
        var scoreData = calculateScores();
        elScoreBadge.textContent = "Score: " + scoreData.pct + "%";
        var isPassed = scoreData.pct >= passingScore;
        var isLast = currentIndex === pages.length - 1;

        if (scormActive && api) {
          api.LMSSetValue("cmi.core.lesson_location", String(currentIndex));
          api.LMSSetValue("cmi.core.score.raw", String(scoreData.pct));
          api.LMSSetValue("cmi.core.score.min", "0");
          api.LMSSetValue("cmi.core.score.max", "100");

          if (isPassed && isLast) {
            api.LMSSetValue("cmi.core.lesson_status", "passed");
            elStatusBadge.textContent = "Passed";
            elStatusBadge.className = "badge badge-passed";
          } else if (isLast) {
            api.LMSSetValue("cmi.core.lesson_status", isPassed ? "passed" : "completed");
            elStatusBadge.textContent = isPassed ? "Passed" : "Completed";
            elStatusBadge.className = "badge " + (isPassed ? "badge-passed" : "badge-status");
          } else {
            api.LMSSetValue("cmi.core.lesson_status", "incomplete");
            elStatusBadge.textContent = "Incomplete";
            elStatusBadge.className = "badge badge-status";
          }

          var suspData = {
            v: 1,
            quizAnswers: quizAnswers,
            quizScores: quizScores,
            pct: scoreData.pct
          };
          api.LMSSetValue("cmi.suspend_data", JSON.stringify(suspData));
          api.LMSCommit("");
        }
      }

      function renderPage() {
        if (!pages[currentIndex]) return;
        var p = pages[currentIndex];
        elStage.innerHTML = "";

        if (p.background && p.background.value) {
          elStage.style.background = p.background.value;
        } else {
          elStage.style.background = "#ffffff";
        }

        (p.nodes || []).forEach(function(node) {
          var div = document.createElement("div");
          div.className = "node-element";
          div.style.left = node.x + "px";
          div.style.top = node.y + "px";
          div.style.width = node.width + "px";
          div.style.height = node.height + "px";
          div.style.zIndex = node.zIndex || 1;

          if (node.type === "text") {
            div.style.color = node.color || "#0f172a";
            div.style.fontSize = (node.fontSize || 16) + "px";
            div.style.fontWeight = node.fontWeight === "bold" ? "700" : (node.fontWeight === "semibold" ? "600" : "400");
            div.style.textAlign = node.textAlign || "left";
            if (node.backgroundColor) div.style.backgroundColor = node.backgroundColor;
            if (node.borderRadius) div.style.borderRadius = node.borderRadius + "px";
            if (node.padding) div.style.padding = node.padding + "px";
            div.innerHTML = node.content.replace(/\\n/g, "<br>");
          } else if (node.type === "image") {
            var img = document.createElement("img");
            img.src = node.url;
            img.alt = node.alt || "";
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = node.objectFit || "cover";
            if (node.borderRadius) img.style.borderRadius = node.borderRadius + "px";
            if (node.shadow) img.style.boxShadow = "0 10px 15px -3px rgba(0,0,0,0.1)";
            div.appendChild(img);
          } else if (node.type === "shape") {
            div.style.backgroundColor = node.fill || "#3b82f6";
            if (node.borderRadius) div.style.borderRadius = node.borderRadius + "px";
            if (node.shapeType === "circle") div.style.borderRadius = "50%";
            if (node.stroke) {
              div.style.border = (node.strokeWidth || 1) + "px solid " + node.stroke;
            }
          } else if (node.type === "callout") {
            div.style.padding = "16px";
            div.style.borderRadius = "8px";
            div.style.background = "#eff6ff";
            div.style.borderLeft = "4px solid #3b82f6";
            div.style.color = "#1e3a8a";
            div.innerHTML = "<strong style='display:block;margin-bottom:6px;font-size:15px;'>" +
              (node.title || "Note") + "</strong><p style='font-size:13px;line-height:1.4;margin:0;'>" +
              (node.content || "") + "</p>";
          } else if (node.type === "quiz") {
            var card = document.createElement("div");
            card.className = "quiz-card";

            var qText = document.createElement("div");
            qText.className = "quiz-question";
            qText.textContent = node.question;
            card.appendChild(qText);

            var optContainer = document.createElement("div");
            optContainer.className = "quiz-options";

            var feedbackEl = document.createElement("div");
            feedbackEl.className = "quiz-feedback";

            var savedSelected = quizAnswers[node.id] || [];

            (node.options || []).forEach(function(opt) {
              var btn = document.createElement("button");
              btn.className = "quiz-option-btn";
              btn.textContent = opt.text;

              if (savedSelected.includes(opt.id)) {
                btn.classList.add("selected");
                if (opt.isCorrect) {
                  btn.classList.add("correct");
                } else {
                  btn.classList.add("incorrect");
                }
              }

              btn.addEventListener("click", function() {
                quizAnswers[node.id] = [opt.id];
                var isRight = Boolean(opt.isCorrect);
                quizScores[node.id] = isRight ? (node.points || 10) : 0;

                optContainer.querySelectorAll(".quiz-option-btn").forEach(function(b) {
                  b.className = "quiz-option-btn";
                });
                btn.classList.add("selected");
                if (isRight) {
                  btn.classList.add("correct");
                  feedbackEl.textContent = opt.feedback || "Correct! Well done.";
                  feedbackEl.className = "quiz-feedback show-correct";
                } else {
                  btn.classList.add("incorrect");
                  feedbackEl.textContent = opt.feedback || "Incorrect. Review the slide and try again.";
                  feedbackEl.className = "quiz-feedback show-incorrect";
                }
                updateScormState();
              });

              optContainer.appendChild(btn);
            });

            card.appendChild(optContainer);
            card.appendChild(feedbackEl);
            div.appendChild(card);
          }

          elStage.appendChild(div);
        });

        // Update Nav
        elPageCounter.textContent = "Slide " + (currentIndex + 1) + " of " + pages.length;
        var pct = ((currentIndex + 1) / pages.length) * 100;
        elProgressBar.style.width = pct + "%";

        elPrev.disabled = currentIndex === 0;
        elNext.disabled = currentIndex === pages.length - 1;
        elNext.textContent = (currentIndex === pages.length - 1) ? "Finish Course" : "Next \u2192";

        updateScormState();
        scaleStage();
      }

      elPrev.addEventListener("click", function() {
        if (currentIndex > 0) {
          currentIndex--;
          renderPage();
        }
      });

      elNext.addEventListener("click", function() {
        if (currentIndex < pages.length - 1) {
          currentIndex++;
          renderPage();
        } else {
          // Completed
          updateScormState();
          alert("Congratulations! You have completed the course.");
        }
      });

      renderPage();
      scaleStage();
    })();
  </script>
</body>
</html>`;
}
