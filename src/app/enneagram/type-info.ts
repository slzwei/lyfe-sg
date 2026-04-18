import type { EnneagramType } from "./scoring";

export interface TypeInfo {
  num: string;
  name: string;
  epithet: string;
  center: "Body" | "Heart" | "Head";
  triad: "Anger" | "Shame" | "Fear";
  summary: string;
  longDesc: string;
  strengths: string[];
  growthEdges: string[];
  careers: string;
  relationships: string;
  famous: string[];
  wings: Record<string, string>;
  color: string;
}

export const TYPE_INFO: Record<EnneagramType, TypeInfo> = {
  1: {
    num: "1",
    name: "The Reformer",
    epithet: "The Principled Idealist",
    center: "Body",
    triad: "Anger",
    summary:
      "Principled, purposeful, self-controlled, and perfectionistic. Ones are driven by a desire to live rightly, improve the world, and avoid fault.",
    longDesc:
      "Ones carry an inner critic that is exacting and relentless. They see what could be better and feel a moral responsibility to close the gap. At their best, they are wise reformers who bring order, integrity, and craftsmanship to everything they touch. Their deepest fear is being corrupt, defective, or wrong; their deepest desire is to have integrity and be good.",
    strengths: [
      "Integrity and ethical clarity",
      "Precision and craftsmanship",
      "Dedicated, improvement-minded",
      "Teaches by example",
      "Fair and principled in conflict",
    ],
    growthEdges: [
      "Softening the inner critic",
      "Allowing imperfection without shame",
      "Recognizing feelings beneath the \u201cshoulds\u201d",
      "Letting play and spontaneity in",
    ],
    careers:
      "Law, medicine, education, editing, quality assurance, policy, craftsmanship. Thrives where standards matter and effort produces measurable rightness.",
    relationships:
      "Loyal and deeply committed. Can come across as critical when offering \u201cimprovements.\u201d Feels loved when their care and effort are acknowledged rather than their flaws catalogued.",
    famous: ["Mahatma Gandhi", "Michelle Obama", "Hermione Granger", "Captain America", "Emma Watson"],
    wings: {
      w9: "The Idealist \u2014 calmer, more detached, philosophical",
      w2: "The Advocate \u2014 warmer, more interpersonal, crusading",
    },
    color: "#B84A3C",
  },
  2: {
    num: "2",
    name: "The Helper",
    epithet: "The Caring Confidant",
    center: "Heart",
    triad: "Shame",
    summary:
      "Generous, demonstrative, people-pleasing, and possessive. Twos find their worth in being needed, loved, and indispensable to others.",
    longDesc:
      "Twos tune into what other people need before they notice what they themselves need. Warmth is their native language. At their healthiest, they give freely without strings, from a full well rather than a leaky one. Their deepest fear is being unworthy of love; their deepest desire is to be loved for who they are, not what they provide.",
    strengths: [
      "Empathic and emotionally attuned",
      "Generous with time and attention",
      "Creates belonging and connection",
      "Remembers the small things",
      "Natural mentor and supporter",
    ],
    growthEdges: [
      "Owning their own needs",
      "Saying no without guilt",
      "Letting themselves receive",
      "Noticing when help tips into control",
    ],
    careers:
      "Counseling, nursing, teaching, HR, hospitality, nonprofit work, coaching. Thrives in roles where the impact is human and visible.",
    relationships:
      "Devoted and attentive. Needs to practice asking directly instead of hinting. Feels loved when their own needs are noticed and prioritized without being asked.",
    famous: ["Mother Teresa", "Dolly Parton", "Samwise Gamgee", "Princess Diana", "Desmond Tutu"],
    wings: {
      w1: "The Servant \u2014 more principled, dutiful, self-sacrificing",
      w3: "The Host \u2014 more image-aware, ambitious, charming",
    },
    color: "#C86B4A",
  },
  3: {
    num: "3",
    name: "The Achiever",
    epithet: "The Adaptive Performer",
    center: "Heart",
    triad: "Shame",
    summary:
      "Success-oriented, pragmatic, adaptive, and image-conscious. Threes are driven to accomplish, to be seen, and to win.",
    longDesc:
      "Threes read the room and shape-shift to succeed in it. Productivity is their refuge from the fear that being is not enough \u2014 only doing is. At their best, they model what is possible: authentic excellence that inspires others. Their deepest fear is being worthless without achievement; their deepest desire is to feel valuable and worthwhile.",
    strengths: [
      "Goal-oriented and driven",
      "Charismatic and inspiring",
      "Efficient and resourceful",
      "Adaptable across contexts",
      "Turns vision into results",
    ],
    growthEdges: [
      "Separating self-worth from output",
      "Letting the mask down in safe company",
      "Feeling feelings rather than scheduling them",
      "Defining success from the inside out",
    ],
    careers:
      "Business, sales, entrepreneurship, sports, entertainment, marketing. Thrives where performance is measurable and visible.",
    relationships:
      "Energetic and attractive partners. Can prioritize image over intimacy. Feels loved when a partner sees the person behind the accomplishments.",
    famous: ["Taylor Swift", "Tom Cruise", "Tony Stark", "Oprah Winfrey", "Beyonc\u00e9"],
    wings: {
      w2: "The Charmer \u2014 warmer, more relational, charismatic",
      w4: "The Professional \u2014 more introspective, artistic, intense",
    },
    color: "#D4A24E",
  },
  4: {
    num: "4",
    name: "The Individualist",
    epithet: "The Romantic Introspective",
    center: "Heart",
    triad: "Shame",
    summary:
      "Sensitive, expressive, dramatic, and withdrawn. Fours live close to their feelings and search for what is authentic, meaningful, and uniquely theirs.",
    longDesc:
      "Fours feel the bittersweetness of existence more acutely than most. They are drawn to beauty, longing, and the particular. At their best, they alchemize suffering into art and bring emotional depth wherever they go. Their deepest fear is having no identity or significance; their deepest desire is to find themselves and their meaning.",
    strengths: [
      "Emotional depth and authenticity",
      "Creative and aesthetic",
      "Empathic with suffering",
      "Sees beauty others miss",
      "Brings meaning to the mundane",
    ],
    growthEdges: [
      "Moving out of melancholy into action",
      "Recognizing what is present rather than missing",
      "Not mistaking intensity for identity",
      "Building steady rhythms",
    ],
    careers:
      "Writing, art, design, therapy, music, film, curation. Thrives where individual voice and emotional truth are prized.",
    relationships:
      "Deeply devoted, sometimes turbulent. Can idealize then disillusion. Feels loved when their inner world is witnessed without being fixed.",
    famous: ["Frida Kahlo", "Bob Dylan", "Vincent van Gogh", "Anne Rice", "Leonard Cohen"],
    wings: {
      w3: "The Aristocrat \u2014 more ambitious, image-aware, productive",
      w5: "The Bohemian \u2014 more cerebral, withdrawn, eccentric",
    },
    color: "#8E5A9E",
  },
  5: {
    num: "5",
    name: "The Investigator",
    epithet: "The Cerebral Observer",
    center: "Head",
    triad: "Fear",
    summary:
      "Perceptive, innovative, secretive, and isolated. Fives conserve energy and resources, preferring to observe and understand rather than participate.",
    longDesc:
      "Fives retreat to the mind to find safety \u2014 if they can understand something, they can master it. They are natural specialists, going deep rather than wide. At their best, they contribute visionary insight the rest of us miss. Their deepest fear is being overwhelmed and depleted; their deepest desire is to be capable and competent.",
    strengths: [
      "Sharp, independent thinking",
      "Expertise and specialization",
      "Objective under pressure",
      "Inventive and innovative",
      "Comfortable with complexity",
    ],
    growthEdges: [
      "Moving from thinking to feeling to doing",
      "Letting people in before fully prepared",
      "Trusting that needs can be met",
      "Sharing unfinished ideas",
    ],
    careers:
      "Research, engineering, academia, writing, analysis, technology. Thrives where depth of thought is rewarded and interruptions are few.",
    relationships:
      "Loyal, private, slow to open but steady once in. Feels loved when their need for space is respected without being taken personally.",
    famous: ["Albert Einstein", "Tim Burton", "Bill Gates", "Stephen Hawking", "Jane Goodall"],
    wings: {
      w4: "The Iconoclast \u2014 more artistic, introspective, unconventional",
      w6: "The Problem Solver \u2014 more practical, loyal, engaged with systems",
    },
    color: "#3F6E8C",
  },
  6: {
    num: "6",
    name: "The Loyalist",
    epithet: "The Committed Skeptic",
    center: "Head",
    triad: "Fear",
    summary:
      "Committed, security-oriented, engaging, and anxious. Sixes scan for what could go wrong so the people and things they love stay safe.",
    longDesc:
      "Sixes are among the most loyal of all types \u2014 to people, to ideas, to causes. Their minds run scenarios ahead of time; they prepare for contingencies others never see coming. At their best, they are courageous in spite of fear, and the glue that holds teams together. Their deepest fear is being without support; their deepest desire is to have security and guidance.",
    strengths: [
      "Loyal and trustworthy",
      "Collaborative and team-oriented",
      "Anticipates risk others miss",
      "Committed for the long haul",
      "Grounds others in reality",
    ],
    growthEdges: [
      "Trusting their own inner authority",
      "Distinguishing real threats from imagined ones",
      "Acting courageously with the fear, not after it",
      "Easing the worst-case loop",
    ],
    careers:
      "Law enforcement, medicine, operations, project management, journalism, teaching. Thrives where loyalty and preparation matter.",
    relationships:
      "Steadfast partners who show love through reliability. Needs reassurance without needing it constantly. Feels loved when their worries are taken seriously rather than dismissed.",
    famous: ["Ellen DeGeneres", "Jon Stewart", "Princess Leia", "Ruth Bader Ginsburg", "Bruce Springsteen"],
    wings: {
      w5: "The Defender \u2014 more cerebral, independent, introverted",
      w7: "The Buddy \u2014 more sociable, optimistic, adventurous",
    },
    color: "#C9A34E",
  },
  7: {
    num: "7",
    name: "The Enthusiast",
    epithet: "The Versatile Optimist",
    center: "Head",
    triad: "Fear",
    summary:
      "Spontaneous, versatile, acquisitive, and scattered. Sevens pursue joy, variety, and possibility \u2014 moving toward the next experience before the last one settles.",
    longDesc:
      "Sevens reframe fast. Pain is reinterpreted as adventure; boredom is the real enemy. They light up rooms and bring permission to enjoy. At their best, they are deeply grateful, present, and capable of staying with what is real. Their deepest fear is being trapped in pain or deprivation; their deepest desire is to be satisfied and content.",
    strengths: [
      "Optimistic and energizing",
      "Versatile, quick-learning",
      "Creative problem-solver",
      "Brings joy to hard things",
      "Sees possibility everywhere",
    ],
    growthEdges: [
      "Staying with discomfort long enough to metabolize it",
      "Finishing what they start",
      "Letting one thing be enough",
      "Feeling the quieter feelings underneath the excitement",
    ],
    careers:
      "Entrepreneurship, travel, creative fields, hospitality, media, consulting. Thrives where variety and new challenges arrive often.",
    relationships:
      "Fun, generous partners who can avoid heavy emotions. Feels loved when their inner seriousness is also welcome, not just the sparkle.",
    famous: ["Robin Williams", "Jim Carrey", "Elizabeth Gilbert", "Richard Branson", "Ellen Page"],
    wings: {
      w6: "The Entertainer \u2014 more loyal, relational, responsible",
      w8: "The Realist \u2014 more grounded, assertive, powerful",
    },
    color: "#E08554",
  },
  8: {
    num: "8",
    name: "The Challenger",
    epithet: "The Protective Leader",
    center: "Body",
    triad: "Anger",
    summary:
      "Powerful, confrontational, self-confident, and decisive. Eights command the room, protect the vulnerable, and refuse to be controlled.",
    longDesc:
      "Eights arrive in a space and claim it. They say the thing others are thinking; they cut through hesitation. Behind the armor is a tender core that has learned the world is not always safe. At their best, they use power to protect, build, and liberate. Their deepest fear is being controlled or harmed; their deepest desire is to protect themselves and determine their own path.",
    strengths: [
      "Decisive and action-oriented",
      "Protects the underdog",
      "Truth-telling without flinching",
      "High energy and drive",
      "Natural leader under pressure",
    ],
    growthEdges: [
      "Letting vulnerability show to safe people",
      "Softening without feeling weak",
      "Noticing impact, not just intent",
      "Resting",
    ],
    careers:
      "Entrepreneurship, law, politics, executive leadership, military, construction. Thrives where decisions must be made and held.",
    relationships:
      "Fiercely loyal and protective. Can steamroll when stressed. Feels loved when a partner can meet their intensity without folding or attacking back.",
    famous: ["Martin Luther King Jr.", "Serena Williams", "Winston Churchill", "Toni Morrison", "Gordon Ramsay"],
    wings: {
      w7: "The Maverick \u2014 more adventurous, entrepreneurial, restless",
      w9: "The Bear \u2014 steadier, more strategic, grounded",
    },
    color: "#7A3E3E",
  },
  9: {
    num: "9",
    name: "The Peacemaker",
    epithet: "The Easygoing Diplomat",
    center: "Body",
    triad: "Anger",
    summary:
      "Receptive, reassuring, complacent, and resigned. Nines seek inner and outer peace, often at the cost of their own priorities.",
    longDesc:
      "Nines absorb the perspectives of everyone around them so easily they sometimes lose their own. They mediate, smooth, and keep the temperature low. At their best, they are the quiet center that steadies a room, fully present with their own agency intact. Their deepest fear is loss and disconnection; their deepest desire is to have inner peace and wholeness.",
    strengths: [
      "Steady and accepting",
      "Sees all sides in conflict",
      "Calming presence",
      "Inclusive and egalitarian",
      "Patient and loyal",
    ],
    growthEdges: [
      "Showing up for their own priorities",
      "Engaging with conflict rather than merging around it",
      "Naming what they actually want",
      "Moving from inertia to action",
    ],
    careers:
      "Mediation, counseling, teaching, design, veterinary work, any role requiring patience and diplomacy. Thrives where harmony and long-term relationships matter.",
    relationships:
      "Warm, undemanding partners. Can disappear into the other person. Feels loved when someone asks what they want and waits for the real answer.",
    famous: ["Barack Obama", "Audrey Hepburn", "Keanu Reeves", "Mister Rogers", "Carl Jung"],
    wings: {
      w8: "The Referee \u2014 more assertive, grounded, willing to confront",
      w1: "The Dreamer \u2014 more principled, orderly, idealistic",
    },
    color: "#6B8E6F",
  },
};
