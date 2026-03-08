/* ═══════════════════════════════════════════════════════════════════════════
 *  Stargazer — Victory Renderer
 *  Theme-specific victory screen rendering functions.
 *
 *  Reads from window: THEMES, RADIUS, COUNT, W, H, winner, points, lines,
 *                     polygons, polygonArea, scores, playerNames, t(),
 *                     CHALK_RAINBOW, CHALK_FILL, drawChalkPaperBg,
 *                     drawChalkSpiral, drawChalkLine, _chalkAnimProgress
 *  Exposes on window: defaultDrawVictory, drawVictoryMinimal,
 *                     generateSupLayout, drawVictorySuprematist,
 *                     drawVictoryChalk, _supLayout
 *  Patches: THEMES.*.drawVictory
 * ═══════════════════════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  var _supLayout = null;

  function defaultDrawVictory(ctx, W, H) {
    // Canvas art absent: victory content displayed in #victory-content (HTML).
  }

  function drawVictoryMinimal(ctx, W, H) {
    if (winner < 0) { ctx.clearRect(0, 0, W, H); return; }
    ctx.clearRect(0, 0, W, H);
    var degree = new Array(COUNT).fill(0);
    lines.forEach(function (player, key) {
      if (player !== winner) return;
      var ab = key.split('-').map(Number);
      degree[ab[0]]++; degree[ab[1]]++;
    });
    var BASE_R = RADIUS * 4;
    var radii = points.map(function (_, i) {
      return degree[i] > 0 ? BASE_R * Math.pow(1.4, degree[i]) : 0;
    });
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.55;
    lines.forEach(function (player, key) {
      if (player !== winner) return;
      var ab = key.split('-').map(Number);
      var p1 = points[ab[0]], p2 = points[ab[1]];
      var dx = p2.x - p1.x, dy = p2.y - p1.y;
      var len = Math.hypot(dx, dy);
      if (len === 0) return;
      var nx = -dy / len, ny = dx / len;
      var offset = len * 0.25;
      var cp1 = { x: p1.x + dx / 3 + nx * offset, y: p1.y + dy / 3 + ny * offset };
      var cp2 = { x: p1.x + 2 * dx / 3 - nx * offset, y: p1.y + 2 * dy / 3 - ny * offset };
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p2.x, p2.y);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.clip();
    points.forEach(function (p, i) {
      if (degree[i] === 0) return;
      var r = radii[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      if (degree[i] === 1) {
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5; ctx.stroke();
      } else if (degree[i] === 2) {
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 2; ctx.stroke();
      } else {
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = '#000000'; ctx.fill();
      }
    });
    ctx.restore();
  }

  function generateSupLayout() {
    var creamColor = '#F5F0E8';
    var goldColor = '#C0BDBA';
    var ANGLE = 37 * Math.PI / 180;
    var DIAG = Math.hypot(W, H);
    var winPolys = polygons.filter(function(p) { return p.player === winner; });
    var losePolys = polygons.filter(function(p) { return p.player !== winner && p.player >= 0; });
    var winScore = winPolys.length;
    var loseScore = losePolys.length;
    var scoreDiff = winScore - loseScore;
    var domination = winScore / Math.max(1, winScore + loseScore);
    var totalLines = lines.size;
    var degree = new Array(COUNT).fill(0);
    lines.forEach(function(player, key) {
      if (player !== winner) return;
      var ab = key.split('-').map(Number);
      degree[ab[0]]++; degree[ab[1]]++;
    });
    var centroid = function(path) {
      var v = path.map(function(i) { return points[i]; });
      return {
        x: v.reduce(function(s,p) { return s + p.x; }, 0) / v.length,
        y: v.reduce(function(s,p) { return s + p.y; }, 0) / v.length
      };
    };
    var winnerPolys = winPolys
      .map(function(item) { return { path: item.path, area: polygonArea(item.path) }; })
      .sort(function(a, b) { return b.area - a.area; });
    var loserPolys = losePolys
      .map(function(item) { return { path: item.path, area: polygonArea(item.path) }; })
      .sort(function(a, b) { return b.area - a.area; });
    var mainColor = (winner === 0) ? '#CC2200' : '#1A1A1A';
    var darkColor = (winner === 0) ? '#1A1A1A' : '#CC2200';
    var activePts = points.filter(function(_, i) { return degree[i] > 0; });
    var mainCx, mainCy;
    if (activePts.length > 0) {
      mainCx = activePts.reduce(function(s, p) { return s + p.x; }, 0) / activePts.length;
      mainCy = activePts.reduce(function(s, p) { return s + p.y; }, 0) / activePts.length;
    } else {
      mainCx = W / 2; mainCy = H / 2;
    }
    var mainR = Math.min(W, H) * (0.18 + domination * 0.22);
    var ringCount = Math.min(3 + winScore, 7);
    var secondCircle = null;
    if (loseScore > 0) {
      var lc = loserPolys.length > 0 ? centroid(loserPolys[0].path) : { x: W * 0.65, y: H * 0.35 };
      var r2 = mainR * (0.15 + loseScore * 0.07);
      secondCircle = { cx: lc.x, cy: lc.y, r2: r2 };
    }
    var lineCount = Math.min(Math.max(1, Math.round(totalLines / 4)), 4);
    var diagLines = [];
    for (var k = 0; k < lineCount; k++) {
      var c = winnerPolys[k] ? centroid(winnerPolys[k].path) : { x: W * (0.3 + k * 0.15), y: H * (0.4 + k * 0.1) };
      diagLines.push({ ax: c.x, ay: c.y, thickness: 4 + (lineCount - 1 - k) * 3 });
    }
    var rects = winnerPolys.slice(0, 5).map(function(item, k) {
      var c = centroid(item.path);
      var w = Math.sqrt(item.area) * 0.8;
      return { cx: c.x, cy: c.y, w: w, h: w * 0.22, color: k === 0 ? mainColor : (k % 2 === 1 ? darkColor : mainColor) };
    });
    var dotCount = Math.min(Math.max(1, loseScore + 1), 5);
    var dotR = Math.min(W, H) * 0.012;
    var dots = [];
    for (var k = 0; k < Math.min(loseScore, dotCount); k++) {
      if (loserPolys[k]) {
        var c = centroid(loserPolys[k].path);
        dots.push({ x: c.x, y: c.y, r: dotR });
      }
    }
    if (dots.length < dotCount) {
      var byDeg = points.map(function(p, i) { return { p: p, d: degree[i] }; })
        .filter(function(item) { return item.d > 0; })
        .sort(function(a, b) { return b.d - a.d; });
      for (var k = 0; dots.length < dotCount && k < byDeg.length; k++) {
        dots.push({ x: byDeg[k].p.x, y: byDeg[k].p.y, r: dotR });
      }
      var fallbacks = [
        { x: W*0.2, y: H*0.2 }, { x: W*0.8, y: H*0.8 },
        { x: W*0.5, y: H*0.5 }, { x: W*0.3, y: H*0.7 }, { x: W*0.7, y: H*0.3 }
      ];
      for (var k = 0; dots.length < dotCount; k++) {
        dots.push({ x: fallbacks[k].x, y: fallbacks[k].y, r: dotR });
      }
    }
    var hatchX = mainCx < W / 2 ? W * 0.82 : W * 0.18;
    var hatchY = H * 0.12;
    var hatchCount = Math.min(Math.max(3, 3 + scoreDiff), 9);
    var showGrid = scoreDiff <= 2;
    return {
      ANGLE: ANGLE, DIAG: DIAG, mainColor: mainColor, darkColor: darkColor, creamColor: creamColor, goldColor: goldColor,
      mainCx: mainCx, mainCy: mainCy, mainR: mainR, ringCount: ringCount,
      secondCircle: secondCircle, diagLines: diagLines, rects: rects, dots: dots,
      hatchX: hatchX, hatchY: hatchY, hatchCount: hatchCount, showGrid: showGrid, degree: degree
    };
  }

  function drawVictorySuprematist(ctx, W, H) {
    if (winner < 0) { ctx.clearRect(0, 0, W, H); return; }
    _supLayout = generateSupLayout();
    var lay = _supLayout;

    // 1. Cream background
    ctx.fillStyle = lay.creamColor;
    ctx.fillRect(0, 0, W, H);

    // 2. Optional grid
    if (lay.showGrid) {
      ctx.strokeStyle = '#E0D5C0';
      ctx.lineWidth = 0.8;
      var gridSpacing = Math.min(W, H) / 12;
      for (var x = 0; x <= W; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (var y = 0; y <= H; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    }

    // 3. Rotated rectangles
    ctx.save();
    lay.rects.forEach(function(rect) {
      ctx.save();
      ctx.translate(rect.cx, rect.cy);
      ctx.rotate(lay.ANGLE);
      ctx.fillStyle = rect.color;
      ctx.fillRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
      ctx.restore();
    });
    ctx.restore();

    // 4. Hatch block
    ctx.strokeStyle = lay.darkColor;
    ctx.lineWidth = 1.2;
    var hatchSpacing = 8;
    for (var k = 0; k < lay.hatchCount; k++) {
      ctx.beginPath();
      ctx.moveTo(lay.hatchX + k * hatchSpacing, lay.hatchY);
      ctx.lineTo(lay.hatchX + k * hatchSpacing - lay.hatchCount * 4, lay.hatchY + lay.hatchCount * 4);
      ctx.stroke();
    }

    // 5. Diagonal lines
    ctx.strokeStyle = lay.darkColor;
    lay.diagLines.forEach(function(line) {
      ctx.lineWidth = line.thickness;
      ctx.beginPath();
      ctx.moveTo(line.ax, line.ay);
      ctx.lineTo(line.ax + lay.DIAG * 1.2 * Math.cos(lay.ANGLE), line.ay + lay.DIAG * 1.2 * Math.sin(lay.ANGLE));
      ctx.stroke();
    });

    // 6. Main circle with rings
    ctx.fillStyle = lay.mainColor;
    ctx.beginPath();
    ctx.arc(lay.mainCx, lay.mainCy, lay.mainR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = lay.darkColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    for (var ring = 1; ring < lay.ringCount; ring++) {
      var ringRadius = lay.mainR + ring * (lay.mainR / lay.ringCount);
      ctx.beginPath();
      ctx.arc(lay.mainCx, lay.mainCy, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 7. Optional second circle
    if (lay.secondCircle) {
      ctx.fillStyle = lay.darkColor;
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.arc(lay.secondCircle.cx, lay.secondCircle.cy, lay.secondCircle.r2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = lay.goldColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 8. Gold dots
    ctx.fillStyle = lay.goldColor;
    lay.dots.forEach(function(dot) {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Noise layers
    var noiseData = ctx.createImageData(W, H);
    var data = noiseData.data;

    // 60000 fine noise
    for (var i = 0; i < data.length; i += 4) {
      var gray = Math.random() * 30;
      data[i] = gray; data[i+1] = gray; data[i+2] = gray;
      data[i+3] = Math.random() * 8;
    }
    ctx.putImageData(noiseData, 0, 0);

    // 800 medium noise
    for (var y = 0; y < H; y += 8) {
      for (var x = 0; x < W; x += 8) {
        if (Math.random() > 0.7) {
          var pix = Math.random() * 60;
          ctx.fillStyle = 'rgba(' + pix + ', ' + pix + ', ' + pix + ', ' + (Math.random() * 0.15) + ')';
          ctx.fillRect(x, y, 8, 8);
        }
      }
    }

    // 150 large near anchors
    [lay.mainCx, lay.hatchX].forEach(function(ax) {
      for (var k = 0; k < 3; k++) {
        var px = ax + (Math.random() - 0.5) * W * 0.4;
        var py = (k === 0 ? lay.mainCy : lay.hatchY) + (Math.random() - 0.5) * H * 0.3;
        ctx.fillStyle = 'rgba(0, 0, 0, ' + (Math.random() * 0.05) + ')';
        ctx.fillRect(px, py, Math.random() * 30 + 10, Math.random() * 30 + 10);
      }
    });

    // Stripe noise
    for (var y = 0; y < H; y += 20) {
      ctx.fillStyle = 'rgba(0, 0, 0, ' + (Math.random() * 0.02) + ')';
      ctx.fillRect(0, y, W, 2);
    }
  }

  function drawVictoryChalk(ctx, W, H) {
    if (winner < 0) { ctx.clearRect(0, 0, W, H); return; }

    var progress = window._chalkAnimProgress || 0;
    var stages = [
      { start: 0.0, end: 0.15 },    // 0: bg
      { start: 0.15, end: 0.35 },   // 1: loser polys
      { start: 0.35, end: 0.50 },   // 2: loser pts
      { start: 0.50, end: 0.65 },   // 3: winner polys
      { start: 0.65, end: 0.80 },   // 4: winner pts
      { start: 0.80, end: 0.92 },   // 5: decor
      { start: 0.92, end: 1.0 }     // 6: text
    ];

    var getStageProgress = function(stage) {
      if (progress < stages[stage].start) return -1;
      if (progress >= stages[stage].end) return 1;
      return (progress - stages[stage].start) / (stages[stage].end - stages[stage].start);
    };

    // Stage 0: background
    drawChalkPaperBg(ctx, W, H);

    // Stage 1: loser polygons
    var loserPolyProgress = getStageProgress(1);
    if (loserPolyProgress > -1) {
      polygons.forEach(function(poly) {
        if (poly.player !== winner && poly.player >= 0) {
          var color = CHALK_FILL[poly.player] || '#000000';
          var alpha = loserPolyProgress < 1 ? loserPolyProgress * 0.4 : 0.4;
          ctx.fillStyle = color;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          poly.path.forEach(function(i, idx) {
            var pt = points[i];
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.closePath();
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
    }

    // Stage 2: loser points
    var loserPtProgress = getStageProgress(2);
    if (loserPtProgress > -1) {
      points.forEach(function(p, i) {
        var isLoser = false;
        for (var pidx = 0; pidx < polygons.length; pidx++) {
          if (polygons[pidx].player !== winner && polygons[pidx].player >= 0 && polygons[pidx].path.indexOf(i) >= 0) {
            isLoser = true;
            break;
          }
        }
        if (isLoser) {
          var r = RADIUS * (0.4 + loserPtProgress * 0.6);
          ctx.fillStyle = '#888888';
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Stage 3: winner polygons
    var winPolyProgress = getStageProgress(3);
    if (winPolyProgress > -1) {
      polygons.forEach(function(poly) {
        if (poly.player === winner) {
          var color = CHALK_FILL[winner] || '#CC0000';
          var alpha = winPolyProgress < 1 ? winPolyProgress * 0.6 : 0.6;
          ctx.fillStyle = color;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          poly.path.forEach(function(i, idx) {
            var pt = points[i];
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.closePath();
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
    }

    // Stage 4: winner points
    var winPtProgress = getStageProgress(4);
    if (winPtProgress > -1) {
      points.forEach(function(p, i) {
        var isWinner = false;
        for (var pidx = 0; pidx < polygons.length; pidx++) {
          if (polygons[pidx].player === winner && polygons[pidx].path.indexOf(i) >= 0) {
            isWinner = true;
            break;
          }
        }
        if (isWinner) {
          var r = RADIUS * (0.4 + winPtProgress * 0.6);
          ctx.fillStyle = CHALK_FILL[winner] || '#CC0000';
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Stage 5: decoration (spiral)
    var decorProgress = getStageProgress(5);
    if (decorProgress > -1) {
      var spiralAlpha = decorProgress < 1 ? decorProgress : 1;
      ctx.globalAlpha = spiralAlpha;
      var centerX = W / 2;
      var centerY = H / 2;
      var maxRadius = Math.max(W, H) * 0.4;
      drawChalkSpiral(ctx, centerX, centerY, maxRadius * decorProgress, CHALK_RAINBOW[0] || '#CCCCCC');
      ctx.globalAlpha = 1;
    }

    // Stage 6: text
    var textProgress = getStageProgress(6);
    if (textProgress > -1) {
      ctx.font = 'bold 48px Arial';
      ctx.fillStyle = CHALK_RAINBOW[0] || '#FFFF00';
      ctx.globalAlpha = textProgress < 1 ? textProgress : 1;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var winnerName = playerNames[winner] || ('Player ' + (winner + 1));
      drawChalkLine(ctx, W / 2, H / 2 - 40, winnerName);
      ctx.font = '32px Arial';
      ctx.fillStyle = '#CCCCCC';
      drawChalkLine(ctx, W / 2, H / 2 + 60, 'Victory!');
      ctx.globalAlpha = 1;
    }
  }

  window.defaultDrawVictory = defaultDrawVictory;
  window.drawVictoryMinimal = drawVictoryMinimal;
  window.generateSupLayout = generateSupLayout;
  window.drawVictorySuprematist = drawVictorySuprematist;
  window.drawVictoryChalk = drawVictoryChalk;

  // Patch THEMES with drawVictory references
  THEMES.stargazer.drawVictory = defaultDrawVictory;
  THEMES.minimal.drawVictory = drawVictoryMinimal;
  THEMES.suprematist.drawVictory = drawVictorySuprematist;
  THEMES.chalk.drawVictory = drawVictoryChalk;

  Object.defineProperty(window, '_supLayout', {
    get: function() { return _supLayout; },
    set: function(v) { _supLayout = v; },
    configurable: true
  });

})();
