#!/usr/bin/env python3
"""
Setup script for ORION Model Foundry
Alternative to Poetry for simple pip installation
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="orion-model-foundry",
    version="1.0.0",
    author="ORION Team",
    description="Fonderie de modèles AI pour ORION - Fusion et optimisation de modèles",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/orion/model-foundry",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "License :: OSI Approved :: Apache Software License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.10",
    install_requires=[
        "torch>=2.5.0",
        "transformers>=4.46.0",
        "accelerate>=0.34.0",
        "safetensors>=0.4.0",
        "sentencepiece>=0.2.0",
        "protobuf>=4.25.0",
        "huggingface-hub>=0.26.0",
        "PyYAML>=6.0.0",
    ],
    extras_require={
        "dev": [
            "pytest>=8.3.0",
            "black>=24.10.0",
            "flake8>=7.1.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "orion-merge=merge_models:main",
            "orion-optimize=optimize_for_web:main",
        ],
    },
)
