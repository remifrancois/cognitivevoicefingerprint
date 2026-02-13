# Alghowinem2013 et al. (2013) — Full Text Extraction

**Source file:** 2013_alghowinem2013.pdf
**Pages:** 15
**Extracted by:** MemoVoice research pipeline (PyMuPDF)

---

## Full Paper Content

SYSTEMATIC REVIEW
Open Access
© The Author(s) 2025. Open Access  This article is licensed under a Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 
International License, which permits any non-commercial use, sharing, distribution and reproduction in any medium or format, as long as you 
give appropriate credit to the original author(s) and the source, provide a link to the Creative Commons licence, and indicate if you modified the 
licensed material. You do not have permission under this licence to share adapted material derived from this article or parts of it. The images or 
other third party material in this article are included in the article’s Creative Commons licence, unless indicated otherwise in a credit line to the 
material. If material is not included in the article’s Creative Commons licence and your intended use is not permitted by statutory regulation or 
exceeds the permitted use, you will need to obtain permission directly from the copyright holder. To view a copy of this licence, visit ​h​t​t​p​:​/​/​c​r​e​a​t​i​
v​e​c​o​m​m​o​n​s​.​o​r​g​/​l​i​c​e​n​s​e​s​/​b​y​-​n​c​-​n​d​/​4​.​0​/.
Lu et al. BMC Psychiatry         (2025) 25:1190 
https://doi.org/10.1186/s12888-025-07628-z
BMC Psychiatry
†First author: Wei Lu
*Correspondence:
Dongmei Wu
wudongmei_2001@163.com
Full list of author information is available at the end of the article
Abstract
Background  Depression diagnosis faces challenges of subjectivity and delay. Speech features offer potential 
objective biomarkers, but a systematic comparison of traditional machine learning (TML) and deep learning (DL) 
models is lacking.
Objective  To evaluate and compare the diagnostic accuracy of TML and DL models for depression detection using 
speech features, and to examine subgroup effects across sample size, validation strategy, language, and diagnostic 
criteria.
Methods  Following PRISMA guidelines, we systematically searched 9 databases (PubMed, Medline, Embase, 
PsycINFO, Scopus, IEEE, Cochrane, ACM Digital Library, and Web of Science) from inception to April 2025. Eligible 
studies included clinically diagnosed patients with depression and healthy controls, assessed using speech-based TML 
or DL models, and reporting sensitivity, specificity, or the area under the curve (AUC). Risk of bias was evaluated using 
the diagnostic Quality Assessment of Diagnostic Accuracy Studies (QUADAS-2). Random-effects bivariate models 
pooled diagnostic performance, and heterogeneity, subgroup, and sensitivity analyses were conducted.
Results  Twenty-five studies met the inclusion criteria (9 TML, 16 DL). TML models showed pooled sensitivity of 0.82 
(95% CI: 0.74–0.88), specificity 0.83 (95% CI: 0.75–0.90), and AUC 0.89 (95% CI: 0.86–0.92). DL models achieved pooled 
sensitivity of 0.83 (95% CI: 0.77–0.88), specificity 0.86 (95% CI: 0.80–0.90), and AUC 0.91 (95% CI: 0.89–0.93). Subgroup 
analyses indicated that diagnostic performance varied by sample size, validation strategy, language, and diagnostic 
criteria.
Conclusion  Both TML and DL models demonstrate good diagnostic accuracy in speech-based depression detection. ​
The marginal but consistent superiority of DL models supports their potential use in secondary care settings for 
confirmatory diagnosis, while TML remains valuable for primary care screening.​.
Clinical trial number  Not applicable.
Diagnostic accuracy of traditional and deep 
learning methods for detecting depression 
based on speech features: a systematic review 
and meta-analysis
Wei Lu1†
, Xiaowei Tang2, Chuan Huang1, Man Wei1, Chengxin Bai1, Xuqing Fan1 and Dongmei Wu3*


---

Page 2 of 15
Lu et al. BMC Psychiatry         (2025) 25:1190 
Introduction
Depression is a major global public health challenge, 
affecting about 4% of the world’s population or more 
than 300 million people. In 2021, around 730,000 peo­
ple died by suicide, making it the third leading cause of 
death among those aged 15 to 29 years [1]. Patients often 
exhibit symptoms such as low mood, diminished inter­
est, and difficulty concentrating, which not only severely 
affect their quality of life but may also lead to long-term 
disability or even suicidal behavior, imposing a heavy 
burden on individuals, families, and society. A research 
report stated that the socioeconomic burden of Major 
Depressive Disorder (MDD) in the United States was 
estimated to be $333.7 billion in 2019 [2]. Early and accu­
rate identification of depression followed by timely inter­
vention is crucial for reducing treatment complications, 
shortening the course of illness, and improving progno­
sis. However, current depression diagnosis faces multiple 
challenges.
The symptoms of depression are highly heterogeneous 
and nonspecific, often coexisting with other physical or 
mental illnesses, which leads to difficulties in differen­
tial diagnosis [3]. Self-reports of patients are significantly 
influenced by cultural background, cognitive abilities, 
and subjective willingness [4].Additionally, current diag­
nostic criteria require symptoms to persist for at least 
two weeks. Coupled with the insufficient use of stan­
dardized assessment tools and the lack of objective bio­
markers, the average diagnostic delay lasts more than 2 
years, with some patients even waiting up to 5 years [5–
7]. Delayed diagnosis may not only trigger hippocampal 
atrophy and prefrontal dysfunction, reducing the effec­
tiveness of antidepressant treatment [8]. but also exac­
erbate disturbances in neurotransmitter systems (such 
as serotonin and dopamine), leading to more irreversible 
biological changes [9].
The screening of traditional scales (such as the Patient 
Health Questionnaire, PHQ-9) has a false positive rate as 
high as 50% in primary care. Even with relatively accurate 
semi-structured interviews, there is still a significant risk 
of misdiagnosis due to nonspecific symptoms, patients’ 
subjective concealment, and insufficient clinical experi­
ence of physicians [10–12]. Cultural differences further 
exacerbate the complexity of diagnosis. For example, 
Tamil patients tend to describe depression using reli­
gious metaphors [13], African Americans may express 
it through negative emotions and interpersonal con­
flicts [14], while immigrant patients often have difficulty 
accurately stating symptoms due to language barriers or 
cultural taboos (such as concepts of privacy) [15]. Such 
cultural variability also raises questions about whether 
speech-based acoustic features such as pitch variability 
or prosodic attenuation are valid across languages and 
cultural groups. Establishing the cross-cultural generaliz­
ability of speech biomarkers is therefore essential before 
clinical implementation.
In the face of these diagnostic dilemmas, researchers 
have been continuously exploring new diagnostic meth­
ods and biomarkers. In recent years, speech character­
istics have gradually become a new direction for the 
objective diagnosis of depression. The speech of indi­
viduals with depression exhibits features such as slowed 
speech rate, prolonged pauses, and reduced fundamental 
frequency fluctuations [16, 17], which are closely associ­
ated with abnormal function of the limbic system [16]. 
By integrating multi-dimensional bio-acoustic indicators 
such as sound source characteristics, spectral features, 
prosodic patterns, and formant parameters, the classifi­
cation performance of depression detection models can 
be significan tly improved [18, 19]. Specifically, there are 
significant differences in acoustic parameter distribu­
tion, time-domain dynamic characteristics, and spectral 
energy patterns between the speech of depressed patients 
and healthy individuals [20]. These differences can serve 
as quantitative indicators to provide technical support for 
grading symptom severity and evaluating treatment effi­
cacy [21].
Compared with the single assessment of traditional 
scales, speech data can be collected remotely and fre­
quently through smartphone applications. For example, 
the analysis of speech fragments from human-computer 
conversations or clinical interviews can achieve a screen­
ing accuracy rate of 93.3%, and model performance 
improves with the increase in audio duration and quan­
tity [22]. Voice features collected by smartphones (such 
as fundamental frequency, pitch, etc.) could track anti­
depressant treatment response in real time. For example, 
the semitone fluctuation of fundamental frequency (F0) 
can reflect changes in emotional states, while energy 
distribution features can dynamically monitor symptom 
progression [23]. This continuous monitoring capability 
compensates for the lag in traditional methods and pro­
vides an objective basis for personalized treatment.
Machine learning (ML) technologies have provided 
powerful tools for the analysis of speech characteristics. 
ML encompasses Traditional Machine Learning (TML) 
(such as Support Vector Machines (SVM) and random 
forests) and Deep Learning (DL) models (such as convo­
lutional neural networks and Transformer). By extracting 
acoustic features like Mel-frequency cepstral coefficients 
Keywords  Depression, Speech features, Traditional machine learning, Deep learning, Diagnostic accuracy, Systematic 
review, Meta-analysis


---

Page 3 of 15
Lu et al. BMC Psychiatry         (2025) 25:1190 
(MFCCs), zero-crossing rate (ZCR), and harmonic-to-
noise ratio (HNR), ML bypasses traditional text analysis 
to directly capture acoustic signatures associated with 
depression [24, 25]. This approach offers significant 
advantages in multilingual and cross-cultural contexts, 
effectively avoiding the diagnostic biases caused by lin­
guistic differences or cultural expression habits.
Machine learning and deep learning have shown prom­
ise across various medical domains, such as in predicting 
COVID-19 hospitalization where optimized algorithms 
improved risk stratification and clinical decision-making 
[26]. Similar studies further demonstrate how advanced 
ML frameworks enhance diagnostic accuracy in diverse 
conditions [27]. In the context of psychiatry, AI models 
for speech-based depression diagnosis have also shown 
encouraging accuracy in laboratory settings; however, 
their real-world generalizability remains limited by small 
sample sizes, non-representative datasets, and training 
biases [28, 29]. A recent review by Liu et al. (2024) [30] 
systematically quantified these challenges, noting that 
68% of studies relied on English datasets and only one-
third reported sufficient diagnostic indices for meta-
analysis, underscoring how language imbalance and 
inadequate external validation restrict robustness and 
clinical applicability of current models.
In primary healthcare institutions with limited hard­
ware resources, the application of deep learning (DL) 
models, particularly convolutional neural networks 
(CNNs), is constrained by their substantial requirements 
for Graphics Processing Unit (GPU) capacity and large-
scale data processing [31]. At the same time, clinicians 
have expressed concerns about the “black box” nature 
of AI. A survey reported that 39.5% of oncologists were 
worried about the opacity of AI decision-making [32], 
and other studies have similarly noted that the lack of 
interpretability may reduce trust and hinder broader clin­
ical adoption [33, 34]. This had limited their wide appli­
cation in clinical practice to a certain extent.
Even though several studies have developed speech 
feature-based TML and DL models for depression pre­
diction, most focus on a single model type and lack a 
systematic comparison of their diagnostic accuracy. This 
gap limits a clear understanding of the relative diagnostic 
performance of the two model types, including the area 
under the curve (AUC), sensitivity, and specificity. It also 
makes it difficult to determine how key methodological 
factors, such as sample size, validation strategy, language, 
and speech task type, influence model performance.
Objectives: Therefore, the present systematic review 
and meta-analysis was designed to (1) compare the 
pooled diagnostic accuracy of TML and DL models in 
speech-based depression detection, and (2) examine 
how subgroup factors including sample size, validation 
strategies, diagnostic criteria, and language affect model 
performance. We hypothesized that DL models will out­
perform TML models in speech-based depression detec­
tion, and that subgroup factors (e.g., larger sample size, 
rigorous validation strategies, consistent diagnostic cri­
teria, and English-language datasets) will be associated 
with better model performance.
Methods
The meta-analysis took the Preferred Reporting Items for 
Systematic Review and Meta-Analysis (PRISMA) guide­
line [35] as the reference. The study was registered in the 
PROSPERO (CRD42024595530). The registration date 
was registered 29/9/2024.
Search strategy
The systematic search of PubMed, Medline, Embase, 
PsycINFO, Scopus, IEEE, Cochrane and Web of Science 
databases for relevant literature published from inception 
to 8 April 2025 was performed. To ensure the inclusion of 
the most recent and comprehensive evidence, an updated 
search was performed on October 10, 2025, during 
which the ACM Digital Library was newly added to the 
search sources. The search strategy used a combination 
of subject terms and free words, with keywords includ­
ing but not limited to: depression, depressive disorder, 
deep learning, machine learning, artificial intelligence, 
automat, sound, speech, voice, acoustic, audio, vessel, 
vocal, pitch, prosody, etc. and their combinations. The 
complete retrieval strategy taking PubMed as an example 
is shown in Table 1 of the Supplementary File (including 
Boolean operators and field tags).
Selection criteria
Inclusion criteria
(1) Population (P): Clinically diagnosed depression 
patients, with control groups being healthy individuals or 
other mentally ill patients explicitly excluded of depres­
sion (e.g., anxiety disorder, schizophrenia, etc.). (2) Index 
Test (I): Machine learning models based on speech fea­
tures, including TML and DL. (3) Comparator (C): The 
gold standard is clinical interview combined with the 
Diagnostic and Statistical Manual of Mental Disorders 
(DSM) or the International Classification of Diseases 
(ICD) diagnostic criteria, or comparison with healthy 
controls using standardized scales (e.g., PHQ-9 [36], the 
Hamilton Depression Scale (HAMD) [37]). (4) Outcomes 
(O): At least one diagnostic performance index must be 
reported (sensitivity, specificity and AUC), or raw data of 
confusion matrix (true positive (TP), false positive (FP), 
true negative (TN), false negative (FN) must be provided. 
(5) Study Design (S): Cross-sectional studies, case-con­
trol studies, or cohort studies.


---

Page 4 of 15
Lu et al. BMC Psychiatry         (2025) 25:1190 
Exclusion criteria
(1) Studies for which the full text was unavailable. (2) 
Animal studies, reviews, conference abstracts, and case 
reports. (3) Multimodal studies were excluded. Although 
such approaches may enhance diagnostic performance, 
their results cannot be attributed solely to speech fea­
tures. To ensure methodological consistency and com­
parability of pooled estimates, this review focused only 
on speech-based models. (4) Studies that relied solely on 
text features (Natural Language Processing, NLP) or non-
speech physiological signals (e.g., electroencephalogram 
- EEG, electrocardiogram - ECG, functional magnetic 
resonance imaging - fMRI) for depression detection. (5) 
Studies that did not report raw data, i.e., those that did 
not provide results of diagnostic tests (TP, FP, TN and 
FN) or related derived indicators. (6) Studies that did not 
use machine learning algorithms. (7) Studies without a 
clear separation of training and testing sets, or without 
Table 1  Subgroup analysis of TML and DL models
Model
Subgroups
Levels
Number
Sen (95%CI)
Spe (95%CI)
PLR 
(95%CI)
NLR (95%CI)
DOR 
(95%CI)
SROC (95%CI)
I2
TML
Sample size
≤ 100
6
0.81 (0.74–0.87)
0.76 
(0.67–0.83)
3.3 (2.4–4.6)
0.25 
(0.17–0.35)
13 
(7–25)
0.86 (0.82–0.88)
100%
>100
5
0.82 (0.67–0.91)
0.87 
(0.73–0.95)
6.5 
(2.6–16.4)
0.21 
(0.10–0.43)
32 
(7-151)
0.91 (0.88–0.93)
68%
Validation 
strategy
Grouped 
validation
6
0.85 (0.75–0.92)
0.89 
(0.77–0.95)
7.6 
(3.4–17.0)
0.16 
(0.09–0.31)
46 
(12–173)
0.93 (0.91–0.95)
68%
Non- 
grouped 
validation
5
0.69 (0.66–0.71)
0.72 
(0.70–0.75)
2.5 (2.3–2.7)
0.43 
(0.40–0.47)
6 (5–7)
0.77 (0.73–0.80]
100%
scales
DSM
6
0.78 (0.69–0.85)
0.71 
(0.59–0.81)
2.7 (1.8–4.2)
0.31 
(0.20–0.47)
9 (4–20)
0.82 (0.78–0.85)
0%
Other scales
5
0.84 (0.70–0.92)
0.89 
(0.79–0.95)
7.7 
(3.6–16.6)
0.18 
(0.09–0.36)
42 
(11–162)
0.93 (0.90–0.95)
0%
Speech task 
type
Interview
6
0.85 (0.73–0.92)
0.85 
(0.72–0.92)
5.6 
(2.6–12.1)
0.18 
(0.08–0.37)
32 
(7-140)
0.92 (0.89–0.94)
31%
Reading
5
0.76 (0.67–0.84)
0.83 
(0.71–0.91)
3.2 (2.2–4.7)
0.29 
(0.19–0.43)
11 
(6–22)
0.83 (0.80–0.86)
68%
DL
Sample size
≤ 100
6
0.75 (0.61–0.85)
0.85 
(0.77–0.90)
4.5 (2.6–7.7)
0.29 
(0.20–0.40)
16 
(8–31)
0.86 (0.82–0.88)
0%
100–500
5
0.86 (0.77–0.92)
0.80 
(0.74–0.85)
4.2 (3.3–5.4)
0.18 
(0.11–0.29)
24 
(14–41)
0.87 (0.84–0.90)
82%
≥ 500
9
0.84 (0.74–0.91)
0.88 
(0.78–0.94)
7.2 
(3.4–15.3)
0.18 
(0.10–0.33)
40 
(11–144)
0.93 (0.90–0.95)
100%
Validation 
strategy
Grouped 
validation
4
0.88 (0.81–0.93)
0.83 
(0.74–0.89)
5.2 (3.5–7.8)
0.18 
(0.10–0.33)
37 
(25–56)
0.92 (0.90–0.94)
83%
Non- 
grouped 
validation
16
0.82 (0.74–0.87)
0.87 
(0.80–0.92)
6.2 
(3.7–10.1)
0.21 
(0.14–0.32)
29 
(12–69)
0.91 (0.88–0.93)
100%
Language
Chinese
7
0.87 (0.85–0.88)
0.81 
(0.71–0.89)
4.6 (2.9–7.4)
0.16 
(0.14–0.19)
28 
(16–50)
0.87 (0.84–0.90)
98%
English
10
0.82 (0.70–0.90)
0.90 
(0.83–0.95)
8.3 
(4.2–16.3)
0.20 
(0.11–0.36)
41 
(12–138)
0.93 (0.90–0.95)
100%
Other
3
0.57–0.74
0.66–0.88
-
-
-
-
scales
DSM
5
0.86 (0.83–0.89)
0.86 
(0.77–0.91)
6.1 (3.7–9.8)
0.16 
(0.13–0.20)
38 
(21–70)
0.87 (0.84–0.90)
88%
Other scales
15
0.81 (0.73–0.88)
0.86 
(0.79–0.92)
5.9 
(3.5–10.0)
0.21 
(0.14–0.33)
28 
(11–68)
0.91 (0.88–0.93)
100%
Speech task 
type
Interview
15
0.83 (0.76–0.88)
0.88 
(0.82–0.93)
7.0 
(4.2–11.5)
0.19 
(0.13–0.29)
36 
(16–85)
0.92 (0.89–0.94)
100%
Reading
5
0.84 (0.70–0.92)
0.77(0.68–
0.85)
3.7 (2.5–5.6)
0.21 
(0.10–0.42)
18 
(7–50)
0.86 (0.83–0.89)
85%
Deep 
Learning 
Architecture
Traditional
10
0.86 (0.80–0.90)
0.90 
(0.84–0.94)
8.2 
(4.9–13.6)
0.16(0.11–
0.24)
52(22–
123)
0.94 (0.91–0.96)
98%
Advanced 
CNNs
10
0.81(0.70–0.89)
0.82(0.71–
0.90)
4.6 (2.6–7.9)
0.23 
(0.14–0.39)
20(7–53) 0.89 (0.85–0.91)
100%


---

Page 5 of 15
Lu et al. BMC Psychiatry         (2025) 25:1190 
an independent test set, nested k-fold (k ≥ 5), or subject-
level cross-validation (e.g., leave-one-subject-out). Ran­
dom utterance-level splits, single random splits, or any 
method with potential train–test overlap were excluded.
Study selection and data extraction
The retrieved literature was imported into EndNote soft­
ware and duplicates were first eliminated. Two research­
ers independently and blindly screened titles, abstracts, 
and full texts against the pre-established criteria. Dis­
crepancies were resolved through discussion or consulta­
tion with a third reviewer.
Extracted information included: authors, year, coun­
try, study design, patient source, diagnostic criteria, 
language, speech features, feature extraction software, 
model type, sample size, diagnostic test results (TP, FP, 
TN, FN), and validation strategy. For diagnostic test data, 
two reviewers independently reconstructed 2 × 2 tables 
when needed. If discrepancies arose (e.g., inconsistent 
reporting of TP/FP/TN/FN across text, tables, or figures), 
they were resolved by applying predefined rules (e.g., pri­
oritizing raw counts over derived indices) and verified by 
consensus with a third reviewer.
Risk of bias assessment
The quality of the included literature was assessed by two 
investigators using the diagnostic Quality Assessment of 
Diagnostic Accuracy Studies (QUADAS-2) [38] recom­
mended by the National Institute for Health and Clini­
cal Excellence. In case of disagreement between the two 
researchers, a third researcher was brought in to reach 
a final consensus. Risk of bias was assessed with QUA­
DAS-2, adapted for AI studies by adding specific signal­
ing questions. For Patient Selection, we asked whether 
participants reflected the intended clinical population 
and whether speech samples were independent across 
subjects. For the Index Test, we evaluated whether model 
development and validation were strictly separated, 
whether preprocessing and feature selection were con­
fined to training data, and whether outcome information 
was unavailable during training. For the Reference Stan­
dard, we checked if diagnoses were based on validated 
clinical criteria (DSM/ICD or standardized scales). For 
Flow and Timing, we assessed whether the time interval 
between speech recording and reference diagnosis was 
short (≤ 2 weeks) and whether all patients were included 
in the analysis. Additional AI-specific questions included: 
risk of train–test leakage, appropriateness of unit of anal­
ysis (subject vs. utterance level), handling of class imbal­
ance, and reporting of missing data. The Risk of bias and 
applicability concerns summary can be found in Supple­
mentary File (Fig. 1).
Data analysis
All analyses were performed in Stata 18 using midas/
metandi routines. From each eligible study, two reviewers 
independently extracted TP, FP, TN, FN; discrepancies 
were resolved by predefined rules (e.g., prioritizing raw 
counts over derived indices) and consensus with a third 
reviewer. Forest plots of sensitivity and specificity and 
summary ROC curves were generated.
We used the bivariate random-effects model (Reitsma) 
to jointly estimate pooled sensitivity and specific­
ity, accounting for potential threshold effects. Thresh­
old effects were evaluated using Spearman correlation 
between logit-transformed sensitivity and specificity. 
When threshold effects were suspected, we additionally 
fitted a hierarchical summary receiver operating char­
acteristic (HSROC) model as a sensitivity analysis. The 
bivariate random-effects model was chosen as the pri­
mary analytic framework because it directly provides 
pooled estimates of sensitivity and specificity while 
accounting for their correlation. This approach is math­
ematically equivalent to the HSROC model under most 
conditions, but offers more clinically interpretable sum­
mary points, making it widely recommended in diagnos­
tic accuracy meta-analyses.
We summarized between-study heterogeneity using I² 
(for sensitivity and specificity), between‐study variance 
(τ²), and 95% Confidence Interval (CI). We did not apply 
a rigid I² cutoff; instead, we interpreted heterogeneity in 
conjunction with τ² and 95%CI, and considering clinically 
and methodologically relevant differences among stud­
ies (e.g., population, diagnostic criteria, language, speech 
task, validation strategy).
We performed bivariate meta-regression to assess the 
impact of algorithm type (DL vs. TML). Pre-specified 
subgroup analyses included sample size (≤ 100 vs. > 100), 
validation strategy (independent test set vs. grouped 
cross-validation), and language. Exploratory analyses 
covered diagnostic criteria, speech task type, and DL 
architecture. For small subgroups (n < 4), we reported 
value ranges. Model robustness was evaluated via leave-
one-out and extreme-size study exclusion, while publi­
cation bias was assessed using Deeks’ funnel asymmetry 
test (P > 0.05 indicating no significant asymmetry).
Results
Literature screening process and results
The initial database search (April 2025) identified 4,428 
records from eight databases. To enhance coverage, 
an updated search including the ACM Digital Library 
was conducted on October 10, 2025, yielding 216 new 
records. These additional studies were screened using the 
same inclusion and exclusion criteria and integrated into 
the overall PRISMA flow. This brought the total number 
of identified records to 4,644. All records were imported 


---

Page 6 of 15
Lu et al. BMC Psychiatry         (2025) 25:1190 
into EndNote for deduplication, removing 1,923 dupli­
cates and leaving 2,721 unique articles for screening. 
During title and abstract screening, 2,559 studies were 
excluded because they were reviews, conference reports, 
or meeting abstracts that did not meet the objectives or 
eligibility criteria of this study. A total of 162 full-text 
articles were reviewed in detail against the eligibility 
criteria.
After full-text review, 137 articles were excluded for 
the following reasons: ①22 articles investigated the role 
of speech signal processing in the detection of depression 
but did not use TML or DL algorithms; ②39 articles did 
Fig. 1  PRISMA diagram of the study selection flow
 


---

Page 7 of 15
Lu et al. BMC Psychiatry         (2025) 25:1190 
not use speech samples to detect depression or used data 
in other formats (e.g., text, emotion, image, video, and 
electroencephalogram, etc.); ③70 studies did not report 
sufficient information to reconstruct a 2 × 2 table, such as 
reporting only AUC or accuracy without sensitivity and 
specificity, or providing precision/recall metrics without 
class counts (TP, FP, TN, FN). Some also reported results 
at the utterance level or as cross-validation averages, 
which prevented subject-level derivation. ④6 articles 
were excluded because they did not have access to the 
full text. Finally, 25 articles were included in this meta-
analysis (Fig. 1).
Characteristics of the included studies
A total of 25 studies were included in this meta-analysis. 
The studies were primarily case-control or cross-sec­
tional in design and were conducted across several coun­
tries, including Brazil, China, France, Germany, Hungary, 
Iran, Japan, Malaysia, Thailand, Turkey, and the USA.
Participants were recruited from a variety of settings, 
such as hospitals (e.g., Ulisses Pernambucano Hospi­
tal and Peking University Sixth Hospital), academic 
institutions (e.g., Saarbrücken University), and publicly 
available datasets (e.g., DAIC-WOZ, AVEC 2013/2014, 
MODMA). The sample sizes of the depression and HC 
groups ranged from 22 to 1650 and 11 to 1650, respec­
tively. The diagnosis of depression was primarily based 
on the DSM-5/IV criteria. Standardized scales, including 
the PHQ-8/9, BDI-II, and the HAMD-17, were also used 
for assessment.
The languages analyzed in the included studies were 
diverse, covering English, Chinese (Mandarin), Portu­
guese, Hungarian, German, Japanese, Malay, Thai, and 
Turkish. Speech data were collected through two main 
task types: clinical interviews and read speech. A variety 
of speech features were extracted for analysis, includ­
ing: Spectral features (e.g., MFCCs and spectrograms). 
Software tools such as GNU Octave, Praat, OpenSMILE, 
MATLAB, and Librosa were used for feature extraction.
The studies employed both TML models, such as SVM, 
RF, and LR, and DL models, including CNN, Trans­
formers, and LSTM networks. To ensure robust per­
formance evaluation, various validation strategies were 
implemented, such as k-fold cross-validation, LOOCV, 
and the use of independent test sets. Detailed character­
istics of each included study are provided in Supplemen­
tary Table 2.
Risk of bias assessment for included studies
The methodological quality of the included studies was 
evaluated using the QUADAS-2 tool (Fig.  2). Overall, 
studies exhibited moderate risk of bias with variability 
across domains. Most studies were rated as low risk for 
Patient Selection because participants were recruited 
from well-defined clinical or public datasets; however, 
several used convenience samples or unbalanced case–
control ratios. In the Index Test domain, about half of the 
studies were rated as high or unclear risk due to insuf­
ficient description of training testing separation and lack 
of blinding to reference standards during model develop­
ment. The Reference Standard domain was generally low 
risk when DSM-based clinical interviews were applied, 
but unclear when only self-report questionnaires (e.g., 
PHQ-9, BDI-II) were used. For Flow and Timing, most 
studies achieved short assessment intervals (≤ 2 weeks) 
and complete inclusion, though several failed to specify 
timing or excluded participants post-hoc. Detailed item-
level justifications are presented in Supplementary Fig. 1.
Meta-analysis results
The 9 TML studies were included, with a total of 11 TML 
models, involving 5882 speech samples. The meta-analy­
sis showed the pooled sensitivity of 0.82 (95% CI: 0.74–
0.88), pooled specificity of 0.83 (95% CI: 0.75–0.90), and 
AUC was 0.89 (95% CI: 0.86–0.92), PLR and NLR were 
4.9 (95% CI: 3.0-8.2) and 0.22 (95% CI: 0.14–0.34), DOR 
was 22 (95% CI: 9.0–55.0). Figures 3 and 4 represents the 
pooled sensitivity and specificity forest plots and SROC 
cure of TML.
The 16 DL studies were included, with a total of 20 DL 
models, involving 701,063 speech samples. Similarly, we 
used the evaluation parameters of sensitivity, and speci­
ficity using a random-effects model, the pooled sensitiv­
ity 0.83 (95% CI: 0.77–0.88), pooled specificity was 0.86 
(95% CI: 0.80–0.90), and AUC was 0.91 (95% CI: 0.89–
0.93). PLR was 6.0 (95% CI: 4.0-8.9), NLR and DOR were 
Fig. 2  Quality assessment results of included studies based on QUADAS-2 tool criteria
 


---

Page 8 of 15
Lu et al. BMC Psychiatry         (2025) 25:1190 
0.20 (95% CI: 0.14–0.28) and 31 (95% CI: 15–61). Fig­
ures 5 and 6 represents the forest plots of pooled sensi­
tivity and specificity and SROC curve of DL.
Subgroup analysis
We further conducted a bivariate meta-regression with 
algorithm type (DL vs. TML) as a covariate. DL models 
showed slightly higher pooled sensitivity and specificity 
than TML models; however, these differences were not 
statistically significant (LRT χ² = 0.30, P = 0.86), indicat­
ing that algorithm type was not a significant source of 
heterogeneity. To explore the potential sources of het­
erogeneity and compare the effects of different factors on 
the diagnostic efficacy of models, this study conducted 
subgroup analyses on TML and DL based on dimensions 
such as sample size, validation strategy, Speech task type, 
language, Deep Learning Architecture, and diagnostic 
scale. Between-group differences were not statistically 
significant (all P for interaction > 0.05). The main findings 
are summarized in Table 1.
Sensitivity analyses
To assess the impact of individual studies on pooled 
effect sizes, a leave-one-out sensitivity analysis was 
performed for TML and DL models. For the 9 TML stud­
ies (11 models), excluding small-sample studies (Hashim 
et al. 2022a, sample size = 90) increased the pooled speci­
ficity from 0.83 to 0.84, while sensitivity and I² remained 
unchanged. In the 16 DL studies (20 models), excluding 
the extreme large-sample study (Ishimaru et al. 2023, 
sample size = 663978) yielded pooled sensitivity and 
specificity of 0.82 and 0.85, respectively, with no signifi­
cant shifts, indicating that large-sample studies did not 
dominate the pooled effect sizes. Overall, the pooled 
sensitivity and specificity of both model types showed 
no substantial fluctuations after excluding any single 
study, confirming the robust stability of the meta-analysis 
results. The plots for the leave-one-out results of TML 
and DL can be found in Supplementary File (Figs. 2 and 
3).
HSROC analyses showed no significant threshold 
effects for either TML (β = 0.23, 95% CI: 0.28–0.74, 
P = 0.39) or DL models (β = 0.13, 95% CI: 0.29–0.55, 
P = 0.54). Pooled sensitivity and specificity estimate from 
HSROC (TML: 0.82/0.83; DL: 0.83/0.86) were virtually 
identical to those from the bivariate model, confirming 
the robustness of our findings (Supplementary Tables 
S3–S4).
Fig. 3  The pooled sensitivity and specificity forest plots of TML. (B) SROC with prediction and confidence contours of TML
 


---

Page 9 of 15
Lu et al. BMC Psychiatry         (2025) 25:1190 
Publication bias analysis
Publication bias was assessed using Deeks’ funnel plot 
asymmetry test, which is recommended for diagnostic 
test accuracy meta-analyses because conventional meth­
ods such as Egger’s or Begg’s tests are not appropriate 
when effect sizes are expressed as diagnostic odds ratios 
(DOR). The Deeks’ test showed no significant asymme­
try for TML models (P = 0.79). Although initial analysis 
indicated asymmetry for DL models (P = 0.01), this was 
driven by one extreme large sample study (Ishimaru et 
al., 2023). After excluding this outlier, the test became 
non-significant (P = 0.98), suggesting the absence of 
small-study effects. Sensitivity analyses confirmed that 
removing this study did not materially change pooled 
sensitivity or specificity.
However, given the limited number of included stud­
ies, the statistical power of this test may be insufficient. 
Therefore, these results should be interpreted with 
caution.
Discussion
Summary of the main findings
We conducted a review of the performance of DL and 
TML in depression detection using speech samples. 
This meta-analysis (9 TML studies and 16 DL stud­
ies, 706,945 speech samples) shows that both TML and 
DL models exhibit favorable performance in leveraging 
speech features for depression detection. Specifically, 
DL demonstrated a pooled sensitivity similar to that of 
TML (0.83 vs. 0.82), but with higher pooled specificity 
(0.86 vs. 0.83) and AUC (0.91 vs. 0.89). Subgroup analysis 
reveals that DL models trained on datasets with a sam­
ple size ≥ 500 achieve an AUC of 0.93. In the subgroup 
with a sample size > 100, the specificity of TML models 
increases from 0.76 to 0.87. Further subgroup analysis 
uncovers language-related performance disparities: the 
English group shows a higher specificity (0.90) than the 
Chinese group (0.81). Additionally, the non - DSM group 
enhances the specificity of TML models (0.71 in the DSM 
group vs. 0.89 in non - DSM scale-based groups).
Comparison with other review
Our findings are consistent with Liu et al. (2024) in terms 
of pooled specificity (0.85) and sensitivity (0.82). A key 
discrepancy emerges, however, in the performance com­
parison between DL and TML models. While Liu et al. 
reported higher accuracy for manually engineered fea­
tures (0.89 vs. 0.82 for end-to-end architectures), our 
meta-analysis indicates that DL models achieved margin­
ally superior performance (AUC: 0.91 vs. 0.89 for TML). 
We hypothesize that this discrepancy stems from critical 
differences in the included studies and methodological 
evolution, primarily concerning ​two factors.
First, our review included more recent studies utilizing 
larger and acoustically more diverse speech corpora (e.g., 
sample sizes ≥ 500). This scale of data allows DL archi­
tectures to fully leverage their capacity for hierarchical 
feature learning, capturing subtle, non-linear temporal 
dynamics (e.g., complex pitch fluctuation) that might be 
missed by static, manual features in TML(34,35,39). In 
contrast, the smaller, less diverse datasets predominant 
in earlier reviews might have constrained DL’s generaliza­
tion, favoring more robust TML approaches.
Second, many DL studies in our analysis employed 
techniques like data augmentation and transfer learning, 
which enhance robustness and were less common in ear­
lier works [40]. The end-to-end training paradigm also 
optimizes the synergy between feature extraction and 
classification.
Therefore, the superior performance of DL in our anal­
ysis likely reflects a combination of larger, more represen­
tative datasets and more advanced modeling techniques, 
highlighting the context-dependent nature of model 
efficacy.
Subgroup and sensitivity analyses
Sample size
DL models (e.g., CNN, Transformer) automate the 
extraction of complex, high-dimensional nonlinear fea­
tures from raw speech data, which enables superior 
performance (AUC: 0.93) when trained on large-scale 
datasets (n ≥ 500). However, this capacity for automated 
Fig. 4  SROC with prediction and confidence contours of TML
 


---

Page 10 of 15
Lu et al. BMC Psychiatry         (2025) 25:1190 
feature learning is not only highly data-dependent but 
also incurs substantial computational costs, including 
significant GPU memory requirements and prolonged 
training times [31]. In contrast, TML models, which rely 
on manually engineered features (e.g., MFCCs), achieve 
robust and data-efficient performance. As evidenced in 
our subgroup analysis, TML’s specificity increased from 
0.76 to 0.87 with larger samples, demonstrating its abil­
ity to refine statistical estimations without the prohibitive 
computational overhead of DL. This fundamental dichot­
omy underscores that model selection should not be 
guided by peak accuracy alone but by a pragmatic trade-
off between performance and computational feasibility.
Language specificity
In our language subgroup analysis, the English group 
exhibited a higher specificity (0.90) than the Chinese 
group (0.81). This discrepancy likely stems from typo­
logical differences between languages. As a stress-timed 
language, English exhibits acoustically more discern­
ible prosodic attenuation (e.g., reduced pitch variabil­
ity, slower speech rate) associated with depression [41]. 
In contrast, tonal languages like Chinese have inherent 
pitch variations (tones) that may obscure or confound 
Fig. 6  SROC with prediction and confidence contours of DL
 
Fig. 5  The pooled sensitivity and specificity forest plots of DL
 


---

Page 11 of 15
Lu et al. BMC Psychiatry         (2025) 25:1190 
pathological prosodic changes, complicating model dif­
ferentiation [39]. Beyond linguistic structure, cultural 
norms shape how depressive symptoms are expressed 
in speech. Differences in metaphor use, indirect expres­
sion, or focus on somatic complaints can alter prosodic 
cues such as pitch, intensity, and pauses. These culturally 
mediated expression styles can affect the acoustic pat­
terns captured by detection models, affecting model per­
formance [42, 43].
Validation strategy
The choice of validation strategy can also influence the 
reported performance of TML models. Grouped vali­
dation (e.g., LOOCV, k-fold CV) yielded considerably 
higher and likely more reliable AUC (0.93) compared to 
independent test set validation (0.77), especially given 
the modest sample sizes in TML studies. This under­
scores the vulnerability of TML performance estimates 
to evaluation methodology in small-sample scenarios 
and emphasizes the critical need for rigorous, repeated 
validation approaches to avoid over- or under-estimation 
of true model capability. In contrast, DL model perfor­
mance showed less dependence on the specific valida­
tion approach (Grouped AUC: 0.92; Non-grouped AUC: 
0.91), likely due to their greater inherent stability with 
larger datasets, provided the test set itself is truly inde­
pendent and representative.
Diagnostic scales
We also found that when TML models used non-DSM 
scales (such as PHQ-9), the specificity reached 0.89, 
which was higher than 0.71 when using DSM scales. The 
DSM requires meeting specific symptom thresholds and 
duration (≥ 2 weeks), potentially excluding individuals 
with subclinical depression or those in very early stages 
whose speech may already exhibit subtle changes detect­
able by ML models [44]. In contrast, continuous scales 
like the PHQ-9 can capture a wider spectrum of symp­
tom severity, aligning better with the potentially more 
sensitive detection capability of ML models based on 
speech68 [45]. This highlights the importance of aligning 
the ML task (e.g., detecting current symptom severity vs. 
strict DSM diagnosis) with the chosen reference standard 
for model training and evaluation.
Speech task type
Subgroup analyses showed better performance for inter­
view-based than reading tasks in both TML and DL mod­
els. Spontaneous speech captures pauses, hesitations, 
and pitch changes linked to depressive psychomotor and 
affective symptoms, whereas reading constrains vari­
ability and suppresses diagnostic cues [46]. Interviews 
also engage cognitive and social-emotional processes 
impaired in depression, further enhancing signal [43, 47]. 
The modest but consistent inferiority of reading tasks 
suggests that models trained solely on scripted speech 
risk limited generalizability, underscoring the importance 
of spontaneous or naturalistic speech for future model 
development.
Deep learning architectures
Our subgroup analysis revealed a finding: traditional 
CNNs demonstrated superior performance compared to 
advanced CNN architectures, with higher sensitivity 0.86 
(95% CI: 0.80–0.90) vs. 0.81 (95% CI:0.70–0.89), specific­
ity 0.90 (95% CI:0.84–0.94) vs. 0.82 (95% CI:0.71–0.90), 
and AUC 0.94 (95% CI:0.91–0.96) vs. 0.89 (95% CI:0.85–
0.91). These results suggest that accuracy is not driven 
by complexity alone. Advanced CNNs require larger 
datasets and may be overfit in small samples, while tra­
ditional CNNs benefit from established preprocessing 
(e.g., MFCCs, spectrograms) that enhances generalizabil­
ity [48–50]. Inconsistent validation further undermines 
advanced CNN performance [51, 52]. Thus, architectural 
innovation does not guarantee diagnostic gains; align­
ing model complexity with data sufficiency and apply­
ing transfer learning or multi-corpus training may be 
essential.
Limitations
Several limitations should be acknowledged when inter­
preting the findings of this meta-analysis.
First, although both TML and DL models demon­
strated good diagnostic accuracy, substantial hetero­
geneity remained across studies (I² for sensitivity and 
specificity generally exceeding 80%), indicating method­
ological and contextual variability rather than random 
error. This heterogeneity could be partly quantified and 
traced to identifiable sources. For TML models based on 
standardized rating scales such as the PHQ-9 rather than 
DSM or ICD interviews, I² was reduced by approximately 
25% points. These findings indicate that both sample size 
and diagnostic reference standards materially influenced 
model stability.
Second, most of the included studies adopted cross-
sectional designs, which restrict causal inference and 
prevent examination of longitudinal changes in speech 
characteristics or treatment-response trajectories. Future 
longitudinal or repeated-measure studies are needed to 
verify whether speech-derived biomarkers can sensitively 
track the course of depression or predict relapse.
Third, the linguistic distribution of included data­
sets was highly imbalanced, with approximately 68% 
based on English-language corpora. This not only lim­
its generalizability to tonal or morphologically com­
plex languages but also reflects potential selection bias 
introduced by database choices, since most indexed 
databases such as PubMed, IEEE, and Scopus primarily 


---

Page 12 of 15
Lu et al. BMC Psychiatry         (2025) 25:1190 
archive English-language research. Consequently, non-
English studies, especially those from East Asian and 
Middle Eastern populations, may have been underrepre­
sented, leading to an overestimation of pooled accuracy 
in English corpora. In addition to linguistic differences, 
cultural norms also shape how depressive symptoms are 
expressed in speech. Variations in metaphor use, indirect 
expression, or emphasis on somatic versus emotional 
complaints may alter prosodic and acoustic patterns, 
potentially affecting model accuracy. This highlights the 
need for culturally sensitive validation to ensure general­
izability across diverse clinical settings.
Fourth, incomplete reporting limited the precision of 
pooled estimates. Nearly one-third of potentially eligible 
studies did not provide sufficient data to reconstruct 2 × 2 
tables, such as missing true positive, false positive, true 
negative, or false negative counts. This precluded calcula­
tion of standard diagnostic indices and may have intro­
duced reporting bias favoring positive findings.
Clinical implementation challenges
To address these issues, future research should focus on 
(1) standardizing preprocessing and feature extraction 
procedures, including consistent frame segmentation and 
noise-reduction settings; (2) adopting uniform diagnostic 
reference standards and transparent data-splitting strat­
egies; (3) performing meta-regression analyses to quan­
tify how sample size, diagnostic criteria, and language 
explain between-study variance; (4) broadening database 
coverage to incorporate non-English studies; and (5) 
fully reporting diagnostic confusion matrices and confi­
dence intervals to support reproducibility and evidence 
synthesis.
The voiceprints and other identity information con­
tained in voice data are highly sensitive and are strictly 
regulated by laws and regulations. We can develop tech­
nologies such as federated learning and differential pri­
vacy. Federated learning avoids the transmission of 
original voice data through distributed training, while 
differential privacy provides mathematically provable pri­
vacy guarantees by injecting noise [53]. Federated learn­
ing combined with Differential Privacy (DP) can train 
voiceprint models to predict speakers’ acoustic features 
while preventing the leakage of identity information, 
achieving “data utility without exposing data” [54].
However, the feasibility of these methods in speech-
based depression detection remains limited. Speech 
data are inherently heterogeneous due to variations in 
accent, background noise, and recording devices, which 
can hinder model convergence in FL settings. Moreover, 
gradients exchanged during FL may still leak sensitive 
attributes, and excessive DP noise can degrade the fine-
grained acoustic cues (e.g., prosody, pauses) that are 
essential for depression detection. Current applications 
in neighboring tasks such as speaker verification dem­
onstrate that FL + DP is technically feasible, but further 
research is needed to balance privacy protection and 
diagnostic performance in clinical speech-based depres­
sion models.
Clinical implementation strategy
Based on this meta-analysis, we propose a hierarchical 
diagnostic framework to optimize resource allocation 
across clinical settings.
Primary Care Screening (TML Models): TML models 
(AUC = 0.89) offer moderate accuracy, low computa­
tional cost, and good interpretability, making them ideal 
for initial screening in resource-constrained settings such 
as primary care, mobile apps, and telehealth. Depression 
screening in primary care is cost-effective: one-time ado­
lescent screening costs $44,483/QALY, annual screening 
$66,822/QALY [55], and adult annual screening $11,134–
34,065/QALY [56]. Collaborative care after screening 
yields $9,592–14,306/QALY and over 100 depression-
free days [57, 58]. Automated TML-based speech screen­
ing could further improve cost-effectiveness by reducing 
staff time and per-case costs while enabling continuous 
passive monitoring through smartphone applications 
that capture naturalistic speech during daily activities.
Secondary/Tertiary Care Confirmation (DL Mod­
els): For individuals flagged by screening, DL models 
(AUC = 0.91) can be deployed in psychiatric clinics or 
specialized services where computational resources 
are available. Their capacity to capture complex speech 
dynamics supports higher-confidence diagnostic confir­
mation, differential diagnosis, and longitudinal treatment 
monitoring.
Developing explainable AI (XAI) methods is essen­
tial to address the “black box” problem and foster clini­
cian trust. Techniques such as SHAP, LIME, or attention 
visualization can reveal which acoustic cues (e.g., pitch, 
speech rate, pauses) drive model predictions, thereby 
improving transparency, aligning results with clini­
cal knowledge, and supporting adoption in real-world 
practice.
Importantly, the choice of algorithm should also be 
aligned with the clinical setting. In primary care or com­
munity health centers, where computational resources 
are limited, TML models may offer a pragmatic solu­
tion for preliminary screening or frequent monitoring. 
Conversely, in psychiatric hospitals or specialized men­
tal health services, DL models can leverage greater com­
putational capacity and richer datasets to provide more 
accurate diagnostic support and longitudinal monitoring. 
Tailoring model deployment to clinical context will maxi­
mize feasibility and clinical utility.


---

Page 13 of 15
Lu et al. BMC Psychiatry         (2025) 25:1190 
Future research directions
Based on this review’s limitations, several future research 
directions are essential to advance the field:
Improve methodological rigor  Future studies must pri­
oritize rigorous design. This includes adopting strict, rep­
resentative patient selection criteria and ensuring a clear 
separation between model development and validation to 
prevent data leakage.
Establish standardized protocols  To reduce heteroge­
neity and allow for meaningful cross-study comparisons, 
standardized protocols for speech feature extraction and 
model evaluation must be established.
Adopt longitudinal designs  Longitudinal research is 
essential to capture the dynamic evolution of speech fea­
tures in relation to depression onset, progression, and 
treatment response, offering insights into potential causal 
relationships.
Integrating 
real-time 
monitoring  Future 
studies 
should investigate how speech-based depression detec­
tion models can be effectively embedded in smartphone 
applications and wearable devices to enable continuous, 
real-world monitoring. Such integration would allow 
early detection of symptom deterioration, dynamic 
assessment of treatment response, and relapse preven­
tion through timely alerts. Additionally, research should 
address challenges related to data heterogeneity, privacy, 
and integration with clinical workflows. This direction 
holds potential to transform episodic diagnostic assess­
ments into continuous mental health monitoring systems.
Enhance interpretability (XAI)  To address the “black 
box” challenge, future work should focus on developing 
XAI methods. This is key to fostering clinical trust and 
adoption.
Broaden evidence synthesis  Finally, future systematic 
reviews must expand their scope by incorporating grey 
literature and unpublished data to mitigate publication 
bias and provide a more comprehensive picture of model 
performance.
Conclusions
In this systematic review and meta-analysis, we evaluated 
the diagnostic accuracy of traditional machine learning 
and deep learning models for speech-based depression 
detection. Both approaches demonstrated promising per­
formance, with deep learning showing marginal advan­
tages. Subgroup analyses indicated that factors such as 
sample size, validation strategy, language, and diagnostic 
reference standards influenced outcomes. Despite these 
encouraging findings, substantial heterogeneity, lim­
ited linguistic diversity, and the predominance of cross-
sectional designs limit the strength of the evidence. To 
enhance clinical applicability and generalizability, future 
studies should adopt more rigorous designs, include 
multilingual datasets, and follow standardized reporting 
frameworks such as PRISMA-Abstract and STARD-AI to 
ensure transparency and reproducibility.
Supplementary Information
The online version contains supplementary material available at ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​
g​/​1​0​.​1​1​8​6​/​s​1​2​8​8​8​-​0​2​5​-​0​7​6​2​8​-​z.
Supplementary Material 1
Acknowledgements
We sincerely thank all the parents who participated in the study for inclusion 
in the systematic review, as well as the authors who provided the raw data for 
their help in this study.
Author contributions
Wei Lu: Conceptualization, Methodology, Software, Visualization, Writing 
– original draft. Tang Xiaowei: Methodology, Data curation, Visualization. 
Dongmei Wu: Conceptualization, Methodology, Supervision, Writing 
- reviewing and editing, Funding acquisition. Man Wei: Methodology, 
Data curation, Visualization. Chuan Huang: Methodology, Data curation, 
Visualization. Chengxin Bai: Methodology, Data curation, Visualization. Xuqing 
Fan: Methodology, Data curation, Visualization.
Funding
This study was supported by the National Natural Science Foundation of 
China (Grant No. 82001444).
Data availability
All data analyzed during this study are included in this published article and 
the original studies’ publication.
Declarations
Ethics, consent to participate, and consent to publish
Not applicable.
Competing interests
The authors declare no competing interests.
Author details
1College of Nursing, Chengdu University of Traditional Chinese Medicine, 
Chengdu, China
2Air Force Hospital of Western Theater Command, PLA, Chengdu, China
3Department of Nursing, Sichuan Provincial People’s Hospital, School of 
Medicine, University of Electronic Science and Technology of China, 32# 
W. Sec 2, 1st Ring Rd, Chengdu 610072, China
Received: 16 September 2025 / Accepted: 10 November 2025
References
1.	
World Health Organization. Depressive disorder (depression). 2025 [cited 
2025 Oct 10]. Available from: ​h​t​t​p​s​:​/​/​w​w​w​.​w​h​o​.​i​n​t​/​n​e​w​s​-​r​o​o​m​/​f​a​c​t​-​s​h​e​e​t​s​/​d​
e​t​a​i​l​/​d​e​p​r​e​s​s​i​o​n
2.	
Greenberg P, Chitnis A, Louie D, Suthoff E, Chen SY, Maitland J, et al. The eco­
nomic burden of adults with major depressive disorder in the united States 
(2019). Adv Ther. 2023;40(10):4460–79. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​1​0​0​7​/​s​1​2​3​2​5​-​0​2​3​-​0​
2​6​2​2​-​x


---

Page 14 of 15
Lu et al. BMC Psychiatry         (2025) 25:1190 
3.	
Malhi GS, Mann JJ, Depression. Lancet. 2018;392(10161):2299–312.
4.	
Mitchell AJ, Vaze A, Rao S. Clinical diagnosis of depression in primary care: a 
meta-analysis. Lancet. 2009;374(9690):609–19.
5.	
Cheung R, O’Donnell S, Madi N, Goldner EM. Factors associated with delayed 
diagnosis of mood and/or anxiety disorders. Health Promot Chronic Dis Prev 
Can. 2017;37(5):137–48. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​2​4​0​9​5​/​h​p​c​d​p​.​3​7​.​5​.​0​2
6.	
Strawbridge R, McCrone P, Ulrichsen A, Zahn R, Eberhard J, Wasserman D, 
et al. Care pathways for people with major depressive disorder: A European 
brain Council value of treatment study. Eur Psychiatry. 2022;65(1):e36. ​h​t​t​p​s​:​/​/​
d​o​i​.​o​r​g​/​1​0​.​1​1​9​2​/​j​.​e​u​r​p​s​y​.​2​0​2​2​.​2​8
7.	
Menkü BE, Akın S, Tamdemir SE, Genis B, Altıparmak T, Cosar B. Diagnostic 
transitions from primary psychiatric disorders to underlying medical condi­
tions: a 5-year retrospective survey from a university hospital sample. Alpha 
Psychiatry. 2024;25(2):226–32. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​5​1​5​2​/​a​l​p​h​a​p​s​y​c​h​i​a​t​r​y​.​2​0​2​4​.​2​
3​1​2​7​4.
8.	
Oluboka OJ, Katzman MA, Habert J, McIntosh D, MacQueen GM, Milev RV, 
et al. Functional recovery in major depressive disorder: providing early 
optimal treatment for the individual patient. Int J Neuropsychopharmacol. 
2018;21(2):128–44. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​1​0​9​3​/​i​j​n​p​/​p​y​x​0​8​1
9.	
Mihaljević S, Pavlović M, Reiner K, Ćaćić M. Therapeutic mechanisms of 
ketamine. Psychiatr Danub. 2020;32(3–4):325–33. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​2​4​8​6​9​/​p​s​
y​d​.​2​0​2​0​.​3​2​5.
10.	 Levis B, Benedetti A, Thombs BD. Accuracy of patient health Questionnaire-9 
(PHQ-9) for screening to detect major depression: individual participant data 
meta-analysis. BMJ. 2019;365:l1476. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​1​1​3​6​/​b​m​j​.​l​1​4​7​6
11.	 Kohrt BA, Luitel NP, Acharya P, Jordans MJD. Detection of depression in low 
resource settings: validation of the patient health questionnaire (PHQ-9) and 
cultural concepts of distress in Nepal. BMC Psychiatry. 2016;16(1):58.
12.	 Chen X. The diversity of clinical features of depressive disorders and their 
diagnostic challenges. Transact Mater Biotechnol Life Sci BBBS. 2024;2:91–95. ​
h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​6​2​0​5​1​/​t​f​y​1​6​r​1​8
13.	 Pandalangat N. Cultural Influences on help-seeking, treatment and support 
for mental health problems – a comparative study using a gender perspec­
tive.University of Toronto; 2011.
14.	 Bailey R, Mokonogho J, Kumar A. Racial and ethnic differences in depression: 
current perspectives. Neuropsychiatr Dis Treat. 2019;15:603–9. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​
/​1​0​.​2​1​4​7​/​N​D​T​.​S​1​2​8​5​8​4
15.	 Lehti A, Hammarström A, Mattsson B. Recognition of depression in people of 
different cultures: a qualitative study. BMC Fam Pract. 2009;10(1):53. ​h​t​t​p​s​:​/​/​d​
o​i​.​o​r​g​/​1​0​.​1​1​8​6​/​1​4​7​1​-​2​2​9​6​-​1​0​-​5​3
16.	 Yamamoto M, Takamiya A, Sawada K, Yoshimura M, Kitazawa M, Liang KC, 
et al. Using speech recognition technology to investigate the association 
between timing-related speech features and depression severity. PLoS ONE. 
2020;15(9):e0238726. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​1​3​7​1​/​j​o​u​r​n​a​l​.​p​o​n​e​.​0​2​3​8​7​2​6
17.	 Seifpanahi MS, Ghaemi T, Ghaleiha A, Sobhani-Rad D, Zarabian MK. The asso­
ciation between depression Severity, Prosody, and voice acoustic features in 
women with depression. ScientificWorldJournal. 2023;2023:9928446. ​h​t​t​p​s​:​/​/​
d​o​i​.​o​r​g​/​1​0​.​1​1​5​5​/​2​0​2​3​/​9​9​2​8​4​4​6
18.	 Aggarwal A, Srivastava A, Agarwal A, Chahal N, Singh D, Alnuaim AA, et al. 
Two-way feature extraction for speech emotion recognition using deep 
learning. Sensors. 2022;22(6):2378. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​3​3​9​0​/​s​2​2​0​6​2​3​7​8.
19.	 Wang J, Zhang L, Liu T, Pan W, Hu B, Zhu T. Acoustic differences between 
healthy and depressed people: a cross-situation study. BMC Psychiatry. 
2019;19(1):300. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​1​1​8​6​/​s​1​2​8​8​8​-​0​1​9​-​2​3​0​0​-​7
20.	 Cummins N, Sethu V, Epps J, Schnieder S, Krajewski J. Analysis of acous­
tic space variability in speech affected by depression. Speech Commun. 
2015;75:27–49. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​1​0​1​6​/​j​.​s​p​e​c​o​m​.​2​0​1​5​.​0​9​.​0​0​3
21.	 Wang Y, Liang L, Zhang Z, Xu X, Liu R, Fang H et al. Fast and accurate assess­
ment of depression based on voice acoustic features: a cross-sectional and 
longitudinal study. Front Psychiatry. 2023 June 21;14:1195276. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​
/​1​0​.​3​3​8​9​/​f​p​s​y​t​.​2​0​2​3​.​1​1​9​5​2​7​6
22.	 Chen Y, Xu C, Liang C, Tao Y, Shi C. Speech-based clinical depression screen­
ing: an empirical study [Preprint]. arXiv. 2024; arXiv:2406.03510v2 [cs.SD] ​h​t​t​p​
s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​4​8​5​5​0​/​a​r​X​i​v​.​2​4​0​6​.​0​3​5​1​0.
23.	 Shin J, Bae SM. Use of voice features from smartphones for 
monitoring depressive disorders: scoping review. Digit Health. 
2024;10:20552076241261920. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​1​1​7​7​/​2​0​5​5​2​0​7​6​2​4​1​2​6​1​9​2​0
24.	 Zhao Q, Fan HZ, Li YL, Liu L, Wu YX, Zhao YL, et al. Vocal acoustic features as 
potential biomarkers for identifying/diagnosing depression: a cross-sectional 
study. Front Psychiatry. 2022;13:815678. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​3​3​8​9​/​f​p​s​y​t​.​2​0​2​2​.​8​1​
5​6​7​8
25.	 Lin RF, Leung TK, Liu YP, Hu KR. Disclosing critical voice features for discrimi­
nating between depression and insomnia—a preliminary study for develop­
ing a quantitative method. Health Care (Don Mills). 2022;10(5):935. ​h​t​t​p​s​:​/​/​d​o​i​
.​o​r​g​/​1​0​.​3​3​9​0​/​h​e​a​l​t​h​c​a​r​e​1​0​0​5​0​9​3​5
26.	 Salehnasab Z, Mousavizadeh A, Ghalamfarsa G, Garavand A, Salehna­
sab C. Predictive modeling of COVID-19 hospitalization using Twenty 
machine learning classification algorithms on cohort data. Front Health Inf. 
2023;12:152. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​3​0​6​9​9​/​f​h​i​.​v​1​2​i​0​.​4​7​3
27.	 Ghaderzadeh M, Salehnasab C. Filter-based feature selection for type II diabe­
tes prediction. J Clin Care Ski 2025 July 10;6(3):121–8. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​5​8​2​0​
9​/​j​c​c​s​.​6​.​3​.​1​2​1
28.	 Ji J, Dong W, Li J, Peng J, Feng C, Liu R, et al. Depressive and mania mood 
state detection through voice as a biomarker using machine learning. Front 
Neurol. 2024 July;4:15:1394210. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​3​3​8​9​/​f​n​e​u​r​.​2​0​2​4​.​1​3​9​4​2​1​0
29.	 Bauer JF, Gerczuk M, Schindler-Gmelch L, Amiriparian S, Ebert DD, Krajewski 
J et al. Validation of machine learning-based assessment of major depressive 
disorder from paralinguistic speech characteristics in routine care. Landi G, 
editor. Depress Anxiety. 2024;2024:1–12. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​1​1​5​5​/​2​0​2​4​/​9​6​6​7​3​
7​7
30.	 Liu L, Liu L, Wafa HA, Tydeman F, Xie W, Wang Y. Diagnostic accuracy of deep 
learning using speech samples in depression: a systematic review and meta-
analysis. J Am Med Inf Assoc. 2024;31(10):2394–404. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​1​0​9​3​/​j​
a​m​i​a​/​o​c​a​e​1​8​9
31.	 Tobore I, Li J, Yuhang L, Al-Handarish Y, Kandwal A, Nie Z, et al. Deep learning 
intervention for health care challenges: some biomedical domain consider­
ations. JMIR MHealth UHealth. 2019;7(8):e11966. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​2​1​9​6​/​1​1​9​
6​6
32.	 Li M, Xiong X, Xu B, Dickson C. Chinese oncologists’ perspectives on integrat­
ing AI into clinical practice: Cross-Sectional survey study. JMIR Form Res. 
2024;8:e53918. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​2​1​9​6​/​5​3​9​1​8
33.	 Ahmed MI, Spooner B, Isherwood J, Lane M, Orrock E, Dennison A. A system­
atic review of the barriers to the implementation of artificial intelligence in 
healthcare. Cureus [Internet]. 2023 Oct 4 [cited 2025 May 26]; ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​
1​0​.​7​7​5​9​/​c​u​r​e​u​s​.​4​6​4​5​4.
34.	 Ejdys J, Czerwińska M, Ginevičius R. Social acceptance of artificial intelligence 
(AI) application for improving medical service diagnostics. Hum Technol. 
2024;20(1):155–77. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​1​4​2​5​4​/​1​7​9​5​-​6​8​8​9​.​2​0​2​4​.​2​0​-​1​.​8
35.	 Page MJ, McKenzie JE, Bossuyt PM, Boutron I, Hoffmann TC, Mulrow CD, et al. 
The PRISMA 2020 statement: an updated guideline for reporting systematic 
reviews. BMJ. 2021;372:n71. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​1​1​3​6​/​b​m​j​.​n​7​1
36.	 Kroenke K, Spitzer RL, Williams JB. The PHQ-9: validity of a brief depression 
severity measure. J Gen Intern Med. 2001 Sept;16(9):606–13. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​
0​.​1​0​4​6​/​j​.​1​5​2​5​-​1​4​9​7​.​2​0​0​1​.​0​1​6​0​0​9​6​0​6​.​x
37.	 Rohan KJ, Rough JN, Evans M, Ho SY, Meyerhoff J, Roberts LM, et al. A 
protocol for the Hamilton rating scale for depression: item scoring rules, rater 
training, and outcome accuracy with data on its application in a clinical trial. J 
Affect Disord. 2016;200:111–8. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​1​0​1​6​/​j​.​j​a​d​.​2​0​1​6​.​0​1​.​0​5​1
38.	 Whiting PF, Rutjes AWS, Westwood ME, Mallett S, Deeks JJ, Reitsma JB, et al. 
QUADAS-2: a revised tool for the quality assessment of diagnostic accuracy 
studies. Ann Intern Med. 2011;155(8):529–36. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​7​3​2​6​/​0​0​0​3​-​4​
8​1​9​-​1​5​5​-​8​-​2​0​1​1​1​0​1​8​0​-​0​0​0​0​9
39.	 Xu S. Automated socio-cognitive assessment of patients with schizophrenia 
and depression [Internet]. Nanyang Technological University; 2022 [cited 
2025 June 23]. Available from: ​h​t​t​p​s​:​/​/​h​d​l​.​h​a​n​d​l​e​.​n​e​t​/​1​0​3​5​6​/​1​5​9​2​5​7.
40.	 Tayeh T, Aburakhia S, Myers R, Shami A. An attention-based convlstm auto­
encoder with dynamic thresholding for unsupervised anomaly detection in 
multivariate time series. arXiv[cs.LG]; 2022 Jan 23. Available from: ​h​t​t​p​:​/​/​a​r​x​i​v​.​
o​r​g​/​a​b​s​/​2​2​0​1​.​0​9​1​7​2.
41.	 Yi H, Smiljanic R, Chandrasekaran B. The effect of talker and listener 
depressive symptoms on speech intelligibility. J Speech Lang Hear Res. 
2019;62(12):4269–81. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​1​0​4​4​/​2​0​1​9​_​J​S​L​H​R​-​S​-​1​9​-​0​1​1​2
42.	 Mao K, Wu Y, Chen J. A systematic review on automated clinical depression 
diagnosis. Npj Ment Health Res. 2023;2(1):20. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​1​0​3​8​/​s​4​4​1​8​
4​-​0​2​3​-​0​0​0​4​0​-​z
43.	 Amorese T, Cuciniello M, Greco C, Sheveleva O, Cordasco G, Glackin C, et al. 
Detecting depression in speech using verbal behavior analysis: a cross-
cultural study. Front Psychol. 2025;16:1514918. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​3​3​8​9​/​f​p​s​y​g​.​
2​0​2​5​.​1​5​1​4​9​1​8
44.	 Zuithoff NP, Vergouwe Y, King M, Nazareth I, Van Wezep MJ, Moons KG, et al. 
The patient health Questionnaire-9 for detection of major depressive disor­
der in primary care: consequences of current thresholds in a crosssectional 


---

Page 15 of 15
Lu et al. BMC Psychiatry         (2025) 25:1190 
study. BMC Fam Pract. 2010;11(1):98. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​1​1​8​6​/​1​4​7​1​-​2​2​9​6​-​1​1​-​9​
8
45.	 Twist K, Stahl D, Amiel SA, Thomas S, Winkley K, Ismail K. Comparison of 
depressive symptoms in type 2 diabetes using a Two-Stage survey design. 
Psychosom Med. 2013;75(8):791–7. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​1​0​9​7​/​P​S​Y​.​0​b​0​1​3​e​3​1​8​2​a​
2​b​1​0​8
46.	 Alghowinem S, Goecke R, Wagner M, Epps J, Breakspear M, Parker G. Detect­
ing depression: a comparison between spontaneous and read speech. In: 
2013 IEEE International Conference on Acoustics, Speech and Signal Process­
ing [Internet]. Vancouver, BC, Canada: IEEE; 2013 [cited 2025 Oct 21]. pp. 
7547–51. Available from: ​h​t​t​p​:​/​/​i​e​e​e​x​p​l​o​r​e​.​i​e​e​e​.​o​r​g​/​d​o​c​u​m​e​n​t​/​6​6​3​9​1​3​0​/.
47.	 Berardi M, Brosch K, Pfarr JK, Schneider K, Sültmann A, Thomas-Odenthal F, 
et al. Relative importance of speech and voice features in the classification of 
schizophrenia and depression. Transl Psychiatry. 2023;13(1):298. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​
g​/​1​0​.​1​0​3​8​/​s​4​1​3​9​8​-​0​2​3​-​0​2​5​9​4​-​0
48.	 Varoquaux G. Cross-validation failure: small sample sizes lead to large error 
bars. NeuroImage. 2018;180:68–77. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​1​0​1​6​/​j​.​n​e​u​r​o​i​m​a​g​e​.​2​0​1​
7​.​0​6​.​0​6​1
49.	 Bonet-Solà D, Alsina-Pagès RM. A comparative survey of feature extraction 
and machine learning methods in diverse acoustic environments. Sensors. 
2021;21(4):1274. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​3​3​9​0​/​s​2​1​0​4​1​2​7​4
50.	 Costantini G, Cesarini V, Brenna E. High-level CNN and machine learning 
methods for speaker recognition. Sensors. 2023;23(7):3461. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​
.​3​3​9​0​/​s​2​3​0​7​3​4​6​1
51.	 Safonova A, Ghazaryan G, Stiller S, Main-Knorn M, Nendel C, Ryo M. Ten deep 
learning techniques to address small data problems with remote sensing. Int 
J Appl Earth Obs Geoinf. 2023;125:103569. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​1​0​1​6​/​j​.​j​a​g​.​2​0​2​3​.​
1​0​3​5​6​9
52.	 Rohlfs C. Generalization in neural networks: a broad survey. arXiv preprint; 
arXiv:2209.01610v3. 2024 Jul 31. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​4​8​5​5​0​/​a​r​X​i​v​.​2​2​0​9​.​0​1​6​1​0.
53.	 Pelikan M, Azam SS, Feldman V, Silovsky J, Honza, Talwar K, Likhomanenko T. 
Federated learning with differential privacy for end-to-end speech recogni­
tion. arXiv [preprint]. 2023 Sep 29. Available from: ​h​t​t​p​s​:​/​/​a​r​x​i​v​.​o​r​g​/​a​b​s​/​2​3​1​0​.​0​
0​0​9​8.
54.	 Granqvist F, Seigel M, van Dalen R, Cahill Á, Shum S, Paulik M. Improving 
on-device speaker verification using federated learning with privacy. arXiv 
Preprint 2020; arXiv:2008.02651 [eess]..Available from: ​h​t​t​p​:​/​/​a​r​x​i​v​.​o​r​g​/​a​b​s​/​2​0​
0​8​.​0​2​6​5​1.
55.	 Doan TT, Hutton DW, Wright DR, Prosser LA. Cost-effectiveness of universal 
routine depression screening for adolescents in primary care. JAMA Health 
Forum. 2025;6(5):e250711. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​1​0​0​1​/​j​a​m​a​h​e​a​l​t​h​f​o​r​u​m​.​2​0​2​5​.​0​7​
1​1
56.	 Yildirim M, Gaynes BN, Keskinocak P, Pence BW, Swann J. The cost-effec­
tiveness of depression screening for the general adult population. J Affect 
Disord. 2022;303:306–14. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​1​0​1​6​/​j​.​j​a​d​.​2​0​2​2​.​0​2​.​0​4​4
57.	 Rost K, Pyne JM, Dickinson LM, LoSasso AT. Cost-effectiveness of enhancing 
primary care depression management on an ongoing basis. Ann Fam Med. 
2005;3(1):7–14. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​1​3​7​0​/​a​f​m​.​2​5​6
58.	 Katon WJ, Schoenbaum M, Fan MY, Callahan CM, Williams J, Hunkeler E, et al. 
Cost-effectiveness of improving primary care treatment of late-life depres­
sion. Arch Gen Psychiatry. 2005;62(12):1313–20. ​h​t​t​p​s​:​/​/​d​o​i​.​o​r​g​/​1​0​.​1​0​0​1​/​a​r​c​h​
p​s​y​c​.​6​2​.​1​2​.​1​3​1​3
Publisher’s note
Springer Nature remains neutral with regard to jurisdictional claims in 
published maps and institutional affiliations.


---
*Full text extracted from PDF for MemoVoice V3 algorithm training.*
